"use client";

import { useState, useEffect, useRef } from "react";
import { HiOutlineChatAlt2, HiOutlineX } from "react-icons/hi";
import { pusherClient } from "@/lib/pusher";
import ChatBox from "./ChatBox";

export default function FloatingChatWrapper({
    tradeId,
    messages: initialMessages,
    currentUserId,
    currentUsername,
    path
}: {
    tradeId: number;
    messages: any[];
    currentUserId: number;
    currentUsername: string;
    path: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
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

    useEffect(() => {
        const channel = pusherClient.subscribe(`trade-${tradeId}`);

        channel.bind("new-message", (data: any) => {
            if (!isOpen && data.sender.id !== currentUserId) {
                setUnreadCount(prev => prev + 1);
            }
        });

        return () => {
            pusherClient.unsubscribe(`trade-${tradeId}`);
        };
    }, [tradeId, isOpen, currentUserId]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
        }
    };

    return (
        <div ref={wrapperRef}>
            {/* Floating Toggle Button */}
            <button
                onClick={toggleChat}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)',
                    cursor: 'pointer',
                    zIndex: 1000,
                    border: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isOpen ? 'rotate(90deg)' : 'none',
                }}
            >
                {isOpen ? <HiOutlineX size={28} /> : <HiOutlineChatAlt2 size={28} />}
                
                {unreadCount > 0 && !isOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        minWidth: '22px',
                        height: '22px',
                        borderRadius: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 6px',
                        border: '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {unreadCount}
                    </div>
                )}
            </button>

            {/* Chat Container Overlay */}
            {isOpen && (
                <div className="floating-chat-container">
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .floating-chat-container {
                            position: fixed;
                            bottom: 6rem;
                            right: 2rem;
                            width: 450px;
                            height: 600px;
                            max-width: calc(100vw - 4rem);
                            max-height: calc(100vh - 8rem);
                            z-index: 1000;
                            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            display: flex;
                            flex-direction: column;
                            border-radius: 24px;
                            overflow: hidden;
                            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                        }
                        @media (max-width: 768px) {
                            .floating-chat-container {
                                right: 1rem;
                                bottom: 6rem;
                                width: calc(100vw - 2rem);
                                max-width: calc(100vw - 2rem);
                                height: 500px;
                                max-height: calc(100dvh - 8rem);
                            }
                        }
                    `}} />
                    <ChatBox 
                        tradeId={tradeId}
                        messages={initialMessages}
                        currentUserId={currentUserId}
                        currentUsername={currentUsername}
                        path={path}
                    />
                </div>
            )}
        </div>
    );
}
