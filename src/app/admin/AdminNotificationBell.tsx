"use client";

import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/lib/pusher";
import { getUnreadAdminNotifications } from "@/app/actions/admin-notifications";
import Link from "next/link";
import { IoNotificationsOutline } from "react-icons/io5";

interface Notification {
    id: number;
    content: string;
    createdAt: Date;
    sender: { username: string };
    trade: { tradeId: string };
}

export default function AdminNotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const data = await getUnreadAdminNotifications();
            setNotifications(data as unknown as Notification[]);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Listen for new messages via Pusher
        const channel = pusherClient.subscribe("admin-notifications");
        channel.bind("new-message-alert", (data: any) => {
            fetchNotifications();
            // Optional: Play a subtle sound or show a toast
        });

        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            pusherClient.unsubscribe("admin-notifications");
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const unreadCount = notifications.length;

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    color: unreadCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.4rem',
                    position: 'relative',
                    transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <IoNotificationsOutline />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'var(--danger)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--bg)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {showDropdown && (
                <div className="notification-dropdown">
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Notifications</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unreadCount} unread</span>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                All caught up! No unread messages.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <Link
                                    key={notif.id}
                                    href={`/admin/trades/${notif.trade.tradeId}`}
                                    onClick={() => setShowDropdown(false)}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border)',
                                        transition: 'background-color 0.2s',
                                        cursor: 'pointer'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>@{notif.sender.username}</span>
                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {notif.content}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                                            Trade: {notif.trade.tradeId}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={{ padding: '0.75rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                            <Link href="/admin/trades" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                View all trades
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
