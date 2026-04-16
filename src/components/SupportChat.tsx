"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiCustomerService2Fill, RiSendPlaneFill, RiCloseLine } from "react-icons/ri";
import { pusherClient } from "@/lib/pusher";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const SupportChat = () => {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string>("");
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Mount
    useEffect(() => {
        setIsMounted(true);
        let id = localStorage.getItem("support_session_id");
        if (!id) {
            id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            localStorage.setItem("support_session_id", id);
        }
        setSessionId(id);
    }, []);

    // Fetch History
    useEffect(() => {
        if (!sessionId) return;

        const fetchHistory = async () => {
            try {
                const res = await fetch(`/api/support?sessionId=${sessionId}`);
                const data = await res.json();
                if (data.messages) {
                    setMessages(data.messages);
                }
            } catch (err) {
                console.error("Support Chat Fetch Error:", err);
            }
        };

        fetchHistory();

        // Subscribe to Pusher
        const channel = pusherClient.subscribe(`support-${sessionId}`);
        channel.bind("new-message", (msg: any) => {
            setMessages((prev) => {
                // Remove any optimistic messages
                const filtered = prev.filter(m => !m.isSending);
                if (filtered.find(m => m.id === msg.id)) return filtered;
                return [...filtered, msg];
            });
            if (!isOpen) setUnreadCount((prev) => prev + 1);
        });

        return () => {
            pusherClient.unsubscribe(`support-${sessionId}`);
        };
    }, [sessionId, isOpen]);

    // Scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = input.trim();
        if (!content) return;

        // Optimistic message
        const tempId = Date.now();
        const optimisticMsg = {
            id: tempId,
            content,
            senderName: session?.user?.name || "Visitor",
            createdAt: new Date().toISOString(),
            isAdmin: false,
            isSending: true
        };

        setMessages((prev) => [...prev, optimisticMsg]);
        setInput("");
        setIsLoading(true);

        try {
            await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId,
                    content,
                    userId: session?.user?.id,
                    senderName: session?.user?.name || "Visitor"
                })
            });
            // Pusher bound event handles official update
        } catch (err) {
            console.error("Support Chat Send Error:", err);
            setMessages((prev) => prev.filter(m => m.id !== tempId));
        } finally {
            setIsLoading(true); // Keep input disabled slightly or handle as needed
            setIsLoading(false);
        }
    };

    if (!isMounted) return null;

    // Hide support chat on Dashboard pages (User / Admin)
    if (pathname?.startsWith("/user") || pathname?.startsWith("/admin")) return null;

    return (
        <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 9999, fontFamily: "inherit" }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            width: "350px",
                            height: "500px",
                            backgroundColor: "#fff",
                            borderRadius: "20px",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                            display: "flex",
                            flexDirection: "column",
                            marginBottom: "20px",
                            overflow: "hidden",
                            border: "1px solid #eee"
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: "20px", background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Card Hive Support</h4>
                                <p style={{ margin: 0, fontSize: "11px", opacity: 0.8 }}>We usually reply instantly</p>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "24px" }}>
                                <RiCloseLine />
                            </button>
                        </div>

                        {/* Messages */}
                        <div 
                            ref={scrollRef}
                            style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", background: "#f8f9fa" }}
                        >
                            {messages.length === 0 && (
                                <div style={{ textAlign: "center", marginTop: "40px", color: "#94A3B8" }}>
                                    <RiCustomerService2Fill size={40} style={{ marginBottom: "12px", opacity: 0.3 }} />
                                    <p style={{ fontSize: "13px" }}>Hi there! How can we help you today?</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div 
                                    key={i} 
                                    style={{ 
                                        alignSelf: msg.isAdmin ? "flex-start" : "flex-end",
                                        maxWidth: "80%",
                                        padding: "10px 14px",
                                        borderRadius: "14px",
                                        backgroundColor: msg.isAdmin ? "#f1f3f5" : "#2563EB",
                                        color: msg.isAdmin ? "#1E293B" : "#fff",
                                        fontSize: "13px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                        opacity: msg.isSending ? 0.6 : 1
                                    }}
                                >
                                    {msg.content}
                                    {msg.isSending && (
                                        <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px", textAlign: "right", fontStyle: "italic" }}>Sending...</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendMessage} style={{ padding: "15px", borderTop: "1px solid #eee", display: "flex", gap: "10px", backgroundColor: "#fff" }}>
                            <input 
                                type="text" 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type a message..."
                                style={{
                                    flex: 1,
                                    border: "1px solid #E2E8F0",
                                    borderRadius: "10px",
                                    padding: "8px 12px",
                                    fontSize: "13px",
                                    outline: "none",
                                    color: "#333"
                                }}
                            />
                            <button 
                                type="submit"
                                style={{
                                    background: "#2563EB",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "10px",
                                    width: "36px",
                                    height: "36px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer"
                                }}
                            >
                                <RiSendPlaneFill />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bubble */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    setUnreadCount(0);
                }}
                style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "30px",
                    backgroundColor: "#2563EB",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 4px 15px rgba(37, 99, 235, 0.4)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    position: "relative"
                }}
            >
                {isOpen ? <RiCloseLine /> : <RiCustomerService2Fill />}
                {unreadCount > 0 && !isOpen && (
                    <div style={{ 
                        position: "absolute", 
                        top: "-5px", 
                        right: "-5px", 
                        backgroundColor: "#EF4444", 
                        color: "white", 
                        borderRadius: "50%", 
                        width: "22px", 
                        height: "22px", 
                        fontSize: "12px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        fontWeight: "bold",
                        border: "2px solid white"
                    }}>
                        {unreadCount}
                    </div>
                )}
            </motion.button>
        </div>
    );
};

export default SupportChat;
