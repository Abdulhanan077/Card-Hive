"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { updateUserTheme } from "@/app/actions/theme";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status, update: updateSession } = useSession();
    // Initialize from localStorage immediately if possible
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem("theme") as Theme) || "light";
        }
        return "light";
    });
    const [mounted, setMounted] = useState(false);

    // Sync from session only when it's fresh or first loaded
    useEffect(() => {
        const sessionTheme = (session?.user as any)?.theme as Theme | undefined;
        const savedTheme = localStorage.getItem("theme") as Theme | null;

        if (status === "authenticated" && sessionTheme) {
            // Only overwrite local if they differ and it's likely a fresh login
            // For refresh stability, we trust localStorage more as it updates instantly
            if (sessionTheme !== savedTheme) {
                setTheme(sessionTheme);
                document.documentElement.setAttribute("data-theme", sessionTheme);
                localStorage.setItem("theme", sessionTheme);
            }
        } else if (savedTheme) {
            document.documentElement.setAttribute("data-theme", savedTheme);
        }
        setMounted(true);
    }, [status, session]);

    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        // Sync with database and update session if logged in
        if (session?.user) {
            try {
                await updateUserTheme(newTheme);
                await updateSession({ theme: newTheme });
            } catch (error) {
                console.error("Failed to sync theme:", error);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
