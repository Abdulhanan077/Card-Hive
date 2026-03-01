"use client";

import { useState } from "react";
import { confirmTradePayment } from "@/app/actions/confirmTrade";
import { useNotification } from "@/context/NotificationContext";

export default function ConfirmReceiptButton({ tradeId }: { tradeId: string }) {
    const { showNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        if (!confirm("Are you sure you have received the payment? This will finalize the trade and award your VIP points.")) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await confirmTradePayment(tradeId);
            if (!result.success) {
                showNotification('ERROR', result.error || "Failed to confirm payment.");
            } else {
                showNotification('SUCCESS', "Payment received! Your VIP points have been awarded.");
            }
            // Page will revalidate and update visually via Server Action
        } catch (e) {
            console.error(e);
            showNotification('ERROR', "An error occurred confirming the payment.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85em', backgroundColor: 'var(--success)', borderColor: 'var(--success)', whiteSpace: 'nowrap' }}
        >
            {isLoading ? "Confirming..." : "Confirm Receipt"}
        </button>
    );
}
