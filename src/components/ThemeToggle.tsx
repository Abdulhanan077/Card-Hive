"use client";

import { useTheme } from "@/context/ThemeContext";
import { HiSun, HiMoon } from "react-icons/hi";

export default function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme();

    // Prevent hydration mismatch by returning a placeholder until mounted
    if (!mounted) {
        return <div className="theme-toggle-btn-placeholder" style={{ opacity: 0 }}></div>;
    }

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            <div className="toggle-icon-wrapper">
                {theme === "light" ? (
                    <HiMoon className="toggle-icon moon" />
                ) : (
                    <HiSun className="toggle-icon sun" />
                )}
            </div>
            <span className="toggle-text">
                {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
        </button>
    );
}
