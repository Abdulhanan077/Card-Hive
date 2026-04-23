"use client";

import { useState, useRef, useEffect } from "react";
import { IoCheckmark, IoCheckmarkDone, IoImageOutline, IoDocumentAttachOutline, IoSend, IoEllipsisHorizontal, IoPencilOutline, IoTrashOutline, IoClose } from "react-icons/io5";
import { pusherClient } from "@/lib/pusher";
import { postMessage, markMessageAsRead, triggerTypingIndicator, deleteMessageAction, editMessageAction } from "../actions/chat";
import { toast } from "react-hot-toast";

interface Message {
    id: number;
    content: string;
    createdAt: Date;
    isRead: boolean;
    sender: { id: number; username: string; role: string };
    fileUrl?: string;
    fileType?: 'IMAGE' | 'FILE';
    isEdited?: boolean;
}

export default function ChatBox({
    tradeId,
    messages: initialMessages,
    currentUserId,
    currentUsername,
    path
}: {
    tradeId: number;
    messages: Message[];
    currentUserId: number;
    currentUsername: string;
    path: string;
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");
    const [showMenuId, setShowMenuId] = useState<number | null>(null);

    // Update messages when initialMessages change (e.g. on navigation)
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Mark existing unread messages as read when joining
    useEffect(() => {
        const unreadFromOthers = messages.filter(m => !m.isRead && m.sender.id !== currentUserId);
        unreadFromOthers.forEach(m => markMessageAsRead(m.id, tradeId));
    }, [tradeId, currentUserId]); // Run once on mount or trade change

    useEffect(() => {
        const channel = pusherClient.subscribe(`trade-${tradeId}`);

        channel.bind("new-message", (data: Message) => {
            setMessages((prev) => {
                // Remove any optimistic messages that might match this sender and content
                // Or just filter out all negative (temp) IDs if we are sure the real one is coming
                const filtered = prev.filter(m => m.id > 0); 
                if (filtered.find(m => m.id === data.id)) return filtered;
                return [...filtered, data];
            });

            // If the message is not from me, mark it as read immediately
            if (data.sender.id !== currentUserId) {
                markMessageAsRead(data.id, tradeId);
            }
        });

        channel.bind("message-seen", (data: { messageId: number }) => {
            setMessages((prev) => prev.map(m => m.id === data.messageId ? { ...m, isRead: true } : m));
        });

        channel.bind("message-updated", (data: { messageId: number, content: string }) => {
            setMessages((prev) => prev.map(m => m.id === data.messageId ? { ...m, content: data.content, isEdited: true } : m));
        });

        channel.bind("message-deleted", (data: { messageId: number }) => {
            setMessages((prev) => prev.filter(m => m.id !== data.messageId));
        });

        channel.bind("typing", (data: { username: string }) => {
            if (data.username !== currentUsername) {
                setTypingUser(data.username);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
            }
        });

        return () => {
            pusherClient.unsubscribe(`trade-${tradeId}`);
        };
    }, [tradeId, currentUserId, currentUsername]);

    // Scroll to bottom on updates
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, typingUser]);

    const handleSend = async (e?: React.FormEvent, fileUrl?: string, fileType?: 'IMAGE' | 'FILE') => {
        if (e) e.preventDefault();
        const messageContent = content.trim();
        if (!messageContent && !fileUrl) return;

        // Optimistic message
        const tempId = -Math.floor(Math.random() * 1000000);
        const optimisticMsg: any = {
            id: tempId,
            content: messageContent,
            createdAt: new Date(),
            isRead: false,
            sender: { id: currentUserId, username: currentUsername, role: "USER" },
            fileUrl,
            fileType,
            isSending: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setContent("");

        try {
            await postMessage(tradeId, messageContent, path, fileUrl, fileType);
            // We don't need to manually remove the optimistic message if Pusher is working correctly,
            // because channel.bind("new-message") will add the real one and temp messages should be filtered
            // However, to be safe and avoid "ghost" messages if Pusher is slow:
            // We keep the optimistic one until the real one arrives via Pusher (handled in useEffect)
        } catch (err) {
            console.error("Failed to send message", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            toast.error("Failed to send message");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            for (const file of files) {
                // Show optimistic message for file immediately
                const tempId = -Math.floor(Math.random() * 1000000);
                const optimisticMsg: any = {
                    id: tempId,
                    content: "Uploading attachment...",
                    createdAt: new Date(),
                    isRead: false,
                    sender: { id: currentUserId, username: currentUsername, role: "USER" },
                    isSending: true
                };
                setMessages(prev => [...prev, optimisticMsg]);

                // 1. Get presigned URL
                const presignedRes = await fetch("/api/uploads/presigned", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
                });

                if (!presignedRes.ok) {
                    throw new Error("Failed to get upload authorization");
                }

                const { uploadUrl, publicUrl } = await presignedRes.json();

                // 2. Upload directly to R2
                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    body: file,
                    headers: { "Content-Type": file.type },
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload file to storage");
                }
                
                // Remove the "Uploading..." placeholder and send the real message
                setMessages(prev => prev.filter(m => m.id !== tempId));
                await handleSend(undefined, publicUrl, file.type.startsWith('image/') ? 'IMAGE' : 'FILE');
            }
        } catch (err) {
            console.error("Upload failed", err);
            toast.error("Failed to upload one or more files. Please try again.");
            // Clean up any remaining "Uploading..." placeholders
            setMessages(prev => prev.filter(m => m.content !== "Uploading attachment..."));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        triggerTypingIndicator(tradeId, currentUsername);
    };

    const handleDelete = async (messageId: number) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await deleteMessageAction(messageId, tradeId);
        } catch (err) {
            console.error("Failed to delete message", err);
            toast.error("Failed to delete message");
        }
    };

    const startEditing = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
        setShowMenuId(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleUpdate = async (messageId: number) => {
        if (!editContent.trim()) return;
        setLoading(true);
        try {
            await editMessageAction(messageId, tradeId, editContent);
            setEditingId(null);
            setEditContent("");
        } catch (err) {
            console.error("Failed to update message", err);
            toast.error("Failed to update message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%", 
            overflow: "hidden",
            backgroundColor: "var(--surface)",
        }}>
            {/* Header / Info bar (optional) */}
            <div style={{ padding: "0.75rem 1.5rem", borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-alt)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Trade Workspace Chat</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", opacity: 0.7 }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e" }}></div>
                    Live
                </span>
            </div>

            {/* Messages Area */}
            <div style={{
                flex: 1,
                padding: "1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                backgroundColor: "var(--background)"
            }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: "center", opacity: 0.5, marginTop: "4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <div style={{ fontSize: "3rem" }}>💬</div>
                        <p>No messages yet. Send a greeting or upload a file.</p>
                    </div>
                ) : (
                    messages.map((msg: any) => {
                        const isMe = msg.sender.id === currentUserId;
                        const isAdminMsg = msg.sender.role === "ADMIN";
                        const isSending = msg.isSending === true;

                        return (
                            <div key={msg.id} style={{
                                alignSelf: isMe ? "flex-end" : "flex-start",
                                maxWidth: "80%",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                opacity: isSending ? 0.6 : 1
                            }}>
                                <div style={{
                                    fontSize: "0.75rem",
                                    opacity: 0.6,
                                    margin: isMe ? "0 8px 0 0" : "0 0 0 8px",
                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px"
                                }}>
                                    {!isMe && (
                                        <div style={{
                                            width: "20px",
                                            height: "20px",
                                            borderRadius: "50%",
                                            backgroundColor: isAdminMsg ? "#ef4444" : "#3b82f6",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "10px",
                                            fontWeight: "bold"
                                        }}>
                                            {isAdminMsg ? "A" : "U"}
                                        </div>
                                    )}
                                    {isMe ? (isSending ? "Sending..." : "Sent") : `@${msg.sender.username}`} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div
                                    onMouseEnter={() => setShowMenuId(msg.id)}
                                    onMouseLeave={() => setShowMenuId(null)}
                                    style={{
                                         backgroundColor: isMe ? (isSending ? "#94a3b8" : "var(--primary)") : "var(--surface)",
                                        color: isMe ? "white" : "var(--foreground)",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "16px",
                                        borderBottomRightRadius: isMe ? "4px" : "16px",
                                        borderBottomLeftRadius: !isMe ? "4px" : "16px",
                                        boxShadow: (isMe && !isSending) ? "0 4px 15px -3px rgba(37, 99, 235, 0.3)" : "var(--shadow-sm)",
                                        wordWrap: "break-word",
                                        position: "relative",
                                        border: isMe ? "none" : "1px solid var(--border)"
                                    }}
                                >
                                    {/* Edit/Delete Menu */}
                                    {isMe && showMenuId === msg.id && !editingId && !isSending && (
                                        <div style={{
                                            position: "absolute",
                                            top: "-32px",
                                            right: "0",
                                            display: "flex",
                                            gap: "2px",
                                            backgroundColor: "white",
                                            padding: "3px",
                                            borderRadius: "10px",
                                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                                            border: "1px solid #e2e8f0",
                                            zIndex: 50,
                                            animation: "fadeIn 0.2s ease-out"
                                        }}>
                                            <button
                                                onClick={() => startEditing(msg)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "#64748b",
                                                    padding: "6px",
                                                    borderRadius: "6px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    transition: "background 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                title="Edit Message"
                                            >
                                                <IoPencilOutline size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    color: "#ef4444",
                                                    padding: "6px",
                                                    borderRadius: "6px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    transition: "background 0.2s"
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fee2e2"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                                                title="Delete Message"
                                            >
                                                <IoTrashOutline size={16} />
                                            </button>
                                        </div>
                                    )}

                                    {msg.fileUrl && (
                                        <div style={{ marginBottom: msg.content ? "0.75rem" : "0" }}>
                                            {msg.fileType === 'IMAGE' ? (
                                                <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                    <img
                                                        src={msg.fileUrl}
                                                        alt="Attachment"
                                                        style={{
                                                            maxWidth: "100%",
                                                            borderRadius: "8px",
                                                            display: "block",
                                                            border: isMe ? "2px solid rgba(255,255,255,0.2)" : "1px solid #e2e8f0"
                                                        }}
                                                    />
                                                </a>
                                            ) : (
                                                <a
                                                    href={msg.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        padding: "0.5rem",
                                                        backgroundColor: isMe ? "rgba(255,255,255,0.1)" : "#f1f5f9",
                                                        borderRadius: "8px",
                                                        color: "inherit",
                                                        textDecoration: "none",
                                                        fontSize: "0.85rem"
                                                    }}
                                                >
                                                    <IoDocumentAttachOutline size={20} />
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        View Document
                                                    </span>
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {editingId === msg.id ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "200px" }}>
                                            <input
                                                type="text"
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                autoFocus
                                                style={{
                                                    width: "100%",
                                                    padding: "4px 8px",
                                                    borderRadius: "4px",
                                                    border: "1px solid #3b82f6",
                                                    color: "black"
                                                }}
                                            />
                                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                                <button onClick={cancelEditing} style={{ fontSize: "0.7rem", color: isMe ? "#e2e8f0" : "#64748b", background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                                                <button onClick={() => handleUpdate(msg.id)} style={{ fontSize: "0.7rem", fontWeight: "bold", color: "white", backgroundColor: "#22c55e", border: "none", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {msg.content && <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.content}</p>}
                                            {msg.isEdited && (
                                                <span style={{ fontSize: "0.6rem", opacity: 0.6, fontStyle: "italic", marginLeft: "4px" }}>(edited)</span>
                                            )}
                                        </>
                                    )}

                                    <div style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                        gap: "4px",
                                        marginTop: "4px",
                                        height: "12px",
                                        opacity: 0.8
                                    }}>
                                        {isMe && !isSending && (
                                            msg.isRead ? <IoCheckmarkDone size={14} /> : <IoCheckmark size={14} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                {typingUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '0.5rem', opacity: 0.7 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                            {typingUser} is typing...
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: "1rem", borderTop: "1px solid var(--border)", backgroundColor: "var(--surface)" }}>
                <form onSubmit={handleSend} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            style={{ display: "none" }}
                            accept="image/*,application/pdf"
                            multiple
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || loading}
                            style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity: (uploading || loading) ? 0.5 : 1,
                                color: "var(--primary)",
                                padding: "8px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "var(--primary-light)",
                                transition: "all 0.2s"
                            }}
                            title="Attach Image or File"
                        >
                            {uploading ? "..." : <IoImageOutline size={20} />}
                        </button>
                    </div>

                    <div style={{ flex: 1, position: "relative" }}>
                        <input
                            type="text"
                            value={content}
                            onChange={handleInputChange}
                            placeholder="Write a message..."
                            className="form-input"
                            style={{
                                width: "100%",
                                marginBottom: 0,
                                borderRadius: "12px",
                                paddingRight: "3rem",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--background)"
                            }}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || uploading || !content.trim()}
                        style={{
                            backgroundColor: (loading || uploading || !content.trim()) ? "#cbd5e1" : "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "12px",
                            height: "42px",
                            width: "42px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        <IoSend size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
