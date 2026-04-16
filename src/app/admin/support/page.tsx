"use client";

import React, { useState, useEffect, useRef } from "react";
import { pusherClient } from "@/lib/pusher";
import { format } from "date-fns";

const AdminSupportPage = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSession, setActiveSession] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch All Sessions
    const fetchSessions = async () => {
        try {
            const res = await fetch("/api/admin/support");
            const data = await res.json();
            if (data.sessions) setSessions(data.sessions);
        } catch (err) {
            console.error("Admin Support Sessions Fetch Error:", err);
        }
    };

    // Fetch Messages for active session
    const fetchMessages = async (sid: string) => {
        try {
            const res = await fetch(`/api/support?sessionId=${sid}`);
            const data = await res.json();
            if (data.messages) setMessages(data.messages);
        } catch (err) {
            console.error("Admin Support Messages Fetch Error:", err);
        }
    };

    useEffect(() => {
        fetchSessions();

        // Subscribe to global new support alerts (to refresh session list)
        const globalChannel = pusherClient.subscribe("admin-support");
        globalChannel.bind("new-message", (data: any) => {
            fetchSessions();
        });

        return () => {
            pusherClient.unsubscribe("admin-support");
        };
    }, []);

    useEffect(() => {
        if (!activeSession) return;
        fetchMessages(activeSession);

        // Subscribe to specific session for real-time messages
        const channel = pusherClient.subscribe(`support-${activeSession}`);
        channel.bind("new-message", (msg: any) => {
            setMessages((prev) => {
                // Prevent duplicate messages in state
                if (prev.find(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        });

        return () => {
            pusherClient.unsubscribe(`support-${activeSession}`);
        };
    }, [activeSession]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !activeSession || isLoading) return;

        const content = input.trim();
        setInput("");
        setIsLoading(true);

        try {
            await fetch("/api/admin/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: activeSession, content })
            });
        } catch (err) {
            console.error("Admin Reply Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--background)' }}>
            {/* Sidebar List */}
            <aside style={{ width: '300px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Active Support Chats</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {sessions.map((s) => (
                        <div 
                            key={s.sessionId}
                            onClick={() => setActiveSession(s.sessionId)}
                            style={{ 
                                padding: '15px 20px', 
                                borderBottom: '1px solid var(--border)', 
                                cursor: 'pointer',
                                backgroundColor: activeSession === s.sessionId ? 'var(--primary-light, #eff6ff)' : 'transparent'
                            }}
                        >
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{s.user?.username ? `@${s.user.username}` : "Anonymous Guest"}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {s.sessionId.substring(0, 8)}...</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{format(new Date(s.createdAt), 'MMM d, HH:mm')}</div>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>No support chats yet.</div>
                    )}
                </div>
            </aside>

            {/* Chat Area */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {activeSession ? (
                    <>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)', zIndex: 10 }}>
                            <h3 style={{ margin: 0, color: 'var(--foreground)' }}>Support with {sessions.find(s => s.sessionId === activeSession)?.user?.username || "Guest"}</h3>
                        </div>
                        <div 
                            ref={scrollRef}
                            style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}
                        >
                            {messages.map((m, i) => (
                                <div 
                                    key={i}
                                    style={{ 
                                        alignSelf: m.isAdmin ? "flex-end" : "flex-start",
                                        maxWidth: "70%",
                                        padding: "10px 15px",
                                        borderRadius: "15px",
                                        backgroundColor: m.isAdmin ? "var(--primary, #2563eb)" : "var(--surface, #f1f5f9)",
                                        color: m.isAdmin ? "#fff" : "var(--foreground, #1e293b)",
                                        fontSize: "14px",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    {m.content}
                                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px', textAlign: 'right' }}>
                                        {format(new Date(m.createdAt), 'HH:mm')}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleReply} style={{ padding: '20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your reply..."
                                style={{ flex: 1, padding: '12px 15px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'transparent', color: 'inherit' }}
                            />
                            <button 
                                type="submit"
                                style={{ padding: '10px 25px', borderRadius: '10px', backgroundColor: 'var(--primary, #2563eb)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Send Reply
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Select a chat to start responding.
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminSupportPage;
