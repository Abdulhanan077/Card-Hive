"use client";

import { useState, useRef, useEffect } from "react";
import { postMessage } from "../actions/chat";

export default function ChatBox({
    tradeId,
    messages,
    currentUserId,
    path
}: {
    tradeId: number;
    messages: {
        id: number;
        content: string;
        createdAt: Date;
        sender: { id: number; username: string; role: string };
    }[];
    currentUserId: number;
    path: string;
}) {
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on exactly messages length change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

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
                                    borderRadius: "1rem",
                                    borderBottomRightRadius: isMe ? "0" : "1rem",
                                    borderBottomLeftRadius: !isMe ? "0" : "1rem",
                                    wordWrap: "break-word"
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: "1rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", backgroundColor: "var(--surface)" }}>
                <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
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
