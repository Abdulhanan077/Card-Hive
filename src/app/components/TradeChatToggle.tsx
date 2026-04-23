"use client";

import { useState, useRef, useEffect } from "react";
import ChatBox from "./ChatBox";
import { IoChatbubblesOutline, IoCloseOutline } from "react-icons/io5";
import { pusherClient } from "@/lib/pusher";

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

export default function TradeChatToggle({
    tradeId,
    initialMessages,
    currentUserId,
    currentUsername,
    path
}: {
    tradeId: number;
    initialMessages: Message[];
    currentUserId: number;
    currentUsername: string;
    path: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial unread count
    useEffect(() => {
        const count = initialMessages.filter(m => !m.isRead && m.sender.role === "ADMIN").length;
        setUnreadCount(count);
    }, [initialMessages]);

    // Pusher for real-time badge
    useEffect(() => {
        const channel = pusherClient.subscribe(`trade-${tradeId}`);

        channel.bind("new-message", (data: Message) => {
            if (!isOpen && data.sender.id !== currentUserId) {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            pusherClient.unsubscribe(`trade-${tradeId}`);
        };
    }, [tradeId, isOpen, currentUserId]);

    // Clear unread count when opening
    useEffect(() => {
        if (isOpen) {
            setUnreadCount(0);
        }
    }, [isOpen]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div 
            ref={containerRef}
            style={{
                position: "fixed",
                bottom: "2rem",
                right: "2rem",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "1rem"
            }}
        >
            {/* Chat Box Overlay */}
            {isOpen && (
                <div style={{
                    width: "400px",
                    maxWidth: "calc(100vw - 4rem)",
                    height: "600px",
                    maxHeight: "calc(100vh - 8rem)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    animation: "slideUp 0.3s ease-out"
                }}>
                    <ChatBox 
                        tradeId={tradeId}
                        messages={initialMessages}
                        currentUserId={currentUserId}
                        currentUsername={currentUsername}
                        path={path}
                    />
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    backgroundColor: isOpen ? "var(--danger)" : "var(--primary)",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.4)",
                    transition: "transform 0.2s, background-color 0.2s",
                    position: "relative"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                title={isOpen ? "Close Chat" : "Open Trade Chat"}
            >
                {isOpen ? <IoCloseOutline size={30} /> : <IoChatbubblesOutline size={30} />}
                
                {unreadCount > 0 && !isOpen && (
                    <div style={{
                        position: "absolute",
                        top: "-5px",
                        right: "-5px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        border: "2px solid white",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }}>
                        {unreadCount}
                    </div>
                )}
            </button>

            <style jsx>{`
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
