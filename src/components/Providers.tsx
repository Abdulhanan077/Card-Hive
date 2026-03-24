"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <Toaster position="top-center" reverseOrder={false} />
                    {children}
                </NotificationProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
