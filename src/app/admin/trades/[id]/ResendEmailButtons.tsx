"use client";

import { useState } from "react";
import {
    resendTradeReceivedEmail,
    resendTradeStatusEmail,
    resendPaymentSentEmailAction
} from "../../../actions/admin-emails";

export default function ResendEmailButtons({ tradeId, status }: { tradeId: number; status: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const handleResend = async (type: "received" | "status" | "payment") => {
        setLoading(type);
        setMessage(null);
        try {
            if (type === "received") await resendTradeReceivedEmail(tradeId);
            if (type === "status") await resendTradeStatusEmail(tradeId);
            if (type === "payment") await resendPaymentSentEmailAction(tradeId);

            setMessage({ text: `Email (${type}) resent successfully!`, type: "success" });
        } catch (err: any) {
            setMessage({ text: err.message || "Failed to resend email", type: "error" });
        } finally {
            setLoading(null);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    return (
        <div className="card" style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Admin Email Controls
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                    onClick={() => handleResend("received")}
                    disabled={!!loading}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                    {loading === "received" ? "Sending..." : "Resend Received"}
                </button>
                <button
                    onClick={() => handleResend("status")}
                    disabled={!!loading}
                    className="btn btn-secondary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                    {loading === "status" ? "Sending..." : "Resend Status Update"}
                </button>
                {status === "PAID" && (
                    <button
                        onClick={() => handleResend("payment")}
                        disabled={!!loading}
                        className="btn btn-secondary"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", borderColor: "var(--success)" }}
                    >
                        {loading === "payment" ? "Sending..." : "Resend Payment Sent"}
                    </button>
                )}
            </div>
            {message && (
                <div style={{
                    marginTop: "1rem",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
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
