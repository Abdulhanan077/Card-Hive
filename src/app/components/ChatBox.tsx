"use client";

import { useState, useRef, useEffect } from "react";
import { postMessage, markMessageAsRead, triggerTypingIndicator } from "../actions/chat";
import { pusherClient } from "@/lib/pusher";
import { IoCheckmark, IoCheckmarkDone } from "react-icons/io5";

interface Message {
    id: number;
    content: string;
    createdAt: Date;
    isRead: boolean;
    sender: { id: number; username: string; role: string };
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
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
                if (prev.find(m => m.id === data.id)) return prev;
                return [...prev, data];
            });

            // If the message is not from me, mark it as read immediately
            if (data.sender.id !== currentUserId) {
                markMessageAsRead(data.id, tradeId);
            }
        });

        channel.bind("message-seen", (data: { messageId: number }) => {
            setMessages((prev) => prev.map(m => m.id === data.messageId ? { ...m, isRead: true } : m));
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        try {
            await postMessage(tradeId, content, path);
            setContent("");
        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setContent(e.target.value);
        // Trigger typing indicator (throttled/debounced if needed, but simple for now)
        // We need the current user's username here. For now, we'll use "Someone" or let it be.
        // Usually, session is passed down. For simplicity, we trigger it.
        triggerTypingIndicator(tradeId, currentUsername);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "400px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", backgroundColor: "var(--surface)" }}>

            {/* Messages Area */}
            <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: "var(--bg-alt)" }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: "center", opacity: 0.5, marginTop: "2rem" }}>
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender.id === currentUserId;
                        const isAdminMsg = msg.sender.role === "ADMIN";

                        return (
                            <div key={msg.id} style={{
                                alignSelf: isMe ? "flex-end" : "flex-start",
                                maxWidth: "75%",
                                display: "flex",
                                flexDirection: "column"
                            }}>
                                <div style={{
                                    fontSize: "0.8rem",
                                    marginBottom: "0.25rem",
                                    marginLeft: "0.5rem",
                                    opacity: 0.7,
                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                }}>
                                    {isAdminMsg && <span style={{ color: "var(--danger)", fontWeight: "bold", marginRight: "4px" }}>🛡️ Admin</span>}
                                    {isMe ? "You" : `@${msg.sender.username}`} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{
                                    backgroundColor: isMe ? "var(--primary)" : "var(--surface-hover)",
                                    color: isMe ? "white" : "var(--foreground)",
                                    padding: "0.75rem 1rem",
                                    paddingRight: isMe ? "2rem" : "1rem",
                                    borderRadius: "1rem",
                                    borderBottomRightRadius: isMe ? "0" : "1rem",
                                    borderBottomLeftRadius: !isMe ? "0" : "1rem",
                                    wordWrap: "break-word",
                                    position: "relative",
                                    marginBottom: "0.2rem"
                                }}>
                                    {msg.content}
                                    {isMe && (
                                        <span style={{
                                            position: "absolute",
                                            bottom: "0.4rem",
                                            right: "0.5rem",
                                            display: "flex",
                                            alignItems: "center",
                                            height: "12px"
                                        }}>
                                            {msg.isRead ? (
                                                <IoCheckmarkDone size={16} color="#4ade80" />
                                            ) : (
                                                <IoCheckmark size={16} color="rgba(255,255,255,0.6)" />
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                {typingUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '0.5rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
                            {typingUser} is typing
                        </div>
                        <div className="typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", backgroundColor: "var(--surface)" }}>
                <input
                    type="text"
                    value={content}
                    onChange={handleInputChange}
                    placeholder="Type your message..."
                    className="form-input"
                    style={{ flex: 1, marginBottom: 0 }}
                    required
                />
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "0.5rem 1.5rem" }}>
                    {loading ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
}
