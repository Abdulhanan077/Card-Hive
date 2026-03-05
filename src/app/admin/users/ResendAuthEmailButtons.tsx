"use client";

import { useState } from "react";
import { resendVerificationEmail, resendForgotPassword } from "../../actions/admin-emails";
import { useNotification } from "@/context/NotificationContext";

export default function ResendAuthEmailButtons({ userId }: { userId: number }) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState<string | null>(null);

    const handleResend = async (type: "verify" | "reset") => {
        setLoading(type);
        try {
            if (type === "verify") await resendVerificationEmail(userId);
            if (type === "reset") await resendForgotPassword(userId);

            showNotification('SUCCESS', `Email (${type === 'verify' ? 'Verification' : 'Reset'}) sent successfully!`);
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to resend email");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label className="form-label" style={{ fontSize: "0.85rem" }}>Resend System Emails</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                    onClick={() => handleResend("verify")}
                    disabled={!!loading}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                >
                    {loading === "verify" ? "..." : "Resend OTP"}
                </button>
                <button
                    onClick={() => handleResend("reset")}
                    disabled={!!loading}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                >
                    {loading === "reset" ? "..." : "Reset Link"}
                </button>
            </div>
        </div>
    );
}
