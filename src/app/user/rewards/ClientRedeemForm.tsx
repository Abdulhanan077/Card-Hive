"use client";

import { useState } from "react";
import { submitRewardRedemptionAction } from "@/app/actions/rewards";
import { useNotification } from "@/context/NotificationContext";

export default function ClientRedeemForm({ currentBalance, completedTradesCount }: { currentBalance: number, completedTradesCount: number }) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const points = parseFloat(formData.get("points") as string);

        if (points < 100) {
            showNotification('ERROR', "The minimum withdrawal amount is 100 points.");
            setLoading(false);
            return;
        }

        if (points > currentBalance) {
            showNotification('ERROR', "You cannot redeem more points than your current balance.");
            setLoading(false);
            return;
        }

        if (completedTradesCount < 5) {
            showNotification('ERROR', `You need at least 5 completed trades to withdraw rewards. You currently have ${completedTradesCount}.`);
            setLoading(false);
            return;
        }

        try {
            await submitRewardRedemptionAction(formData);
            showNotification('SUCCESS', 'Reward redemption request submitted successfully!');
            (e.target as HTMLFormElement).reset();
        } catch (err: any) {
            showNotification('ERROR', err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Points to Redeem</label>
                <input type="number" name="points" min="1" max={currentBalance} step="any" className="form-input" required disabled={currentBalance === 0} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payout Method</label>
                <select name="payoutMethod" className="form-select" required disabled={currentBalance === 0}>
                    <option value="Mobile Money">Mobile Money (Direct transfer)</option>
                    <option value="Crypto">Crypto (USDT)</option>
                    <option value="Add to Next Trade">Add to Next Giftcard Trade</option>
                </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Payout Details (Number/Wallet Address)</label>
                <input type="text" name="payoutDetails" className="form-input" disabled={currentBalance === 0} placeholder="Enter your Momo number or note..." />
            </div>

            <button type="submit" className="btn btn-primary" disabled={currentBalance === 0 || loading}>
                {loading ? "Processing..." : "Submit Redemption"}
            </button>
        </form>
    );
}
