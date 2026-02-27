"use client";

import { useState } from "react";
import { submitRewardRedemptionAction } from "@/app/actions/rewards";

export default function ClientRedeemForm({ currentBalance, completedTradesCount }: { currentBalance: number, completedTradesCount: number }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess(false);

        const formData = new FormData(e.currentTarget);
        const points = parseFloat(formData.get("points") as string);

        if (points < 100) {
            setError("The minimum withdrawal amount is 100 points.");
            setLoading(false);
            return;
        }

        if (points > currentBalance) {
            setError("You cannot redeem more points than your current balance.");
            setLoading(false);
            return;
        }

        if (completedTradesCount < 5) {
            setError(`You need at least 5 completed trades to withdraw rewards. You currently have ${completedTradesCount}.`);
            setLoading(false);
            return;
        }

        try {
            await submitRewardRedemptionAction(formData);
            setSuccess(true);
            (e.target as HTMLFormElement).reset();
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            {error && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', padding: '0.5rem', backgroundColor: '#fef2f2', borderRadius: '4px' }}>{error}</div>}
            {success && <div style={{ color: 'var(--success)', fontSize: '0.9rem', padding: '0.5rem', backgroundColor: '#ecfdf5', borderRadius: '4px' }}>Request submitted successfully!</div>}

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
