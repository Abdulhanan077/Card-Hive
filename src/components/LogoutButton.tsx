"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({ className = "sidebar-link" }: { className?: string }) {
    const handleLogout = async () => {
        await signOut({ callbackUrl: "/login" });
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            className={className}
            style={{
                width: "100%",
                textAlign: "left",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginTop: "auto", // Push to bottom if flexbox allows
                color: "var(--danger)",
            }}
        >
            Log Out
        </button>
    );
}
