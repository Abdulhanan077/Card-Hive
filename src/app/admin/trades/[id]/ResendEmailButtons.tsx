"use client";

import { useState } from "react";
import {
    resendTradeReceivedEmail,
    resendTradeStatusEmail,
    resendPaymentSentEmailAction
} from "../../../actions/admin-emails";
import { useNotification } from "@/context/NotificationContext";

export default function ResendEmailButtons({ tradeId, status }: { tradeId: number; status: string }) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState<string | null>(null);

    const handleResend = async (type: "received" | "status" | "payment") => {
        setLoading(type);
        try {
            if (type === "received") await resendTradeReceivedEmail(tradeId);
            if (type === "status") await resendTradeStatusEmail(tradeId);
            if (type === "payment") await resendPaymentSentEmailAction(tradeId);

            showNotification('SUCCESS', `Email (${type}) resent successfully!`);
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to resend email");
        } finally {
            setLoading(null);
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
        </div>
    );
}
