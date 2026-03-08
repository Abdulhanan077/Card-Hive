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
    const { data: session, status } = useSession();
    const [theme, setTheme] = useState<Theme>("light");
    const [mounted, setMounted] = useState(false);

    // Initial load from session or localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        const sessionTheme = (session?.user as any)?.theme as Theme | undefined;

        if (sessionTheme) {
            setTheme(sessionTheme);
            document.documentElement.setAttribute("data-theme", sessionTheme);
            localStorage.setItem("theme", sessionTheme);
        } else if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute("data-theme", savedTheme);
        } else {
            setTheme("light");
            document.documentElement.setAttribute("data-theme", "light");
        }
        setMounted(true);
    }, [session, status]);

    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);

        // Sync with database if logged in
        if (session?.user) {
            await updateUserTheme(newTheme);
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
