"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

export type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    showNotification: (type: NotificationType, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((type: NotificationType, message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((prev) => [...prev, { id, type, message }]);

        // Auto remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <ToastContainer notifications={notifications} removeNotification={removeNotification} />
        </NotificationContext.Provider>
    );
};

const ToastContainer = ({ notifications, removeNotification }: {
    notifications: Notification[],
    removeNotification: (id: string) => void
}) => {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        >
            {notifications.map((n) => (
                <Toast key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
            ))}
        </div>
    );
};

const Toast = ({ notification, onClose }: { notification: Notification, onClose: () => void }) => {
    const { type, message } = notification;

    const config = {
        SUCCESS: { icon: <FaCheckCircle />, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
        ERROR: { icon: <FaExclamationCircle />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
        INFO: { icon: <FaInfoCircle />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
        WARNING: { icon: <FaExclamationTriangle />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
    }[type];

    return (
        <div
            className="glass animate-in"
            style={{
                pointerEvents: 'auto',
                minWidth: '300px',
                maxWidth: '450px',
                padding: '1rem 1.25rem',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                borderLeft: `4px solid ${config.color}`,
                background: 'var(--surface)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer'
            }}
            onClick={onClose}
        >
            <div style={{ color: config.color, fontSize: '1.25rem', display: 'flex' }}>
                {config.icon}
            </div>
            <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--foreground)' }}>
                {message}
            </div>
        </div>
    );
};
