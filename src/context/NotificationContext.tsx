"use client";

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

export type NotificationType = 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';

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
    const showNotification = useCallback((type: NotificationType, message: string) => {
        const toastOptions = {
            style: {
                borderRadius: '12px',
                background: '#333',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 500,
            },
        };

        switch (type) {
            case 'SUCCESS':
                toast.success(message, toastOptions);
                break;
            case 'ERROR':
                toast.error(message, toastOptions);
                break;
            case 'WARNING':
                toast(message, { ...toastOptions, icon: '⚠️' });
                break;
            case 'INFO':
            default:
                toast(message, { ...toastOptions, icon: 'ℹ️' });
                break;
        }
    }, []);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
