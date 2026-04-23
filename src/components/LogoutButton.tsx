"use client";

import { signOut } from "next-auth/react";
import { HiOutlineArrowLeftOnRectangle } from "react-icons/hi2";

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
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem"
            }}
        >
            <HiOutlineArrowLeftOnRectangle style={{ fontSize: '1.2rem' }} />
            Log Out
        </button>
    );
}
