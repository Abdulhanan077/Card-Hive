"use client";

import { useState } from "react";
import { resendVerificationEmail, resendForgotPassword } from "../../actions/admin-emails";

export default function ResendAuthEmailButtons({ userId }: { userId: number }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const handleResend = async (type: "verify" | "reset") => {
        setLoading(type);
        setMessage(null);
        try {
            if (type === "verify") await resendVerificationEmail(userId);
            if (type === "reset") await resendForgotPassword(userId);

            setMessage({ text: `Email (${type === 'verify' ? 'Verification' : 'Reset'}) sent successfully!`, type: "success" });
        } catch (err: any) {
            setMessage({ text: err.message || "Failed to resend email", type: "error" });
        } finally {
            setLoading(null);
            setTimeout(() => setMessage(null), 5000);
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
            {message && (
                <div style={{
                    marginTop: "0.5rem",
                    padding: "0.4rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
                    color: message.type === "success" ? "#166534" : "#991b1b",
                    border: `1px solid ${message.type === "success" ? "#bbf7d0" : "#fecaca"}`
                }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
