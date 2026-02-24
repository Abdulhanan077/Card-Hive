"use client";

import { useState } from "react";
import { saveSettings } from "./actions";

export default function ClientSettingsForm({ settings }: { settings: any }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        const formData = new FormData(e.currentTarget);

        try {
            await saveSettings(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000); // Hide after 4 seconds
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {success && (
                <div style={{
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid #bbf7d0",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                }}>
                    <span>✅</span> Settings saved successfully!
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Site Name</label>
                <input
                    type="text"
                    name="siteName"
                    className="form-input"
                    defaultValue={settings?.siteName || "Card Hive Trading Center"}
                    required
                />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div className="form-group">
                    <label className="form-label">Support Email</label>
                    <input
                        type="email"
                        name="contactEmail"
                        className="form-input"
                        defaultValue={settings?.contactEmail || "support@omorbiggy.com"}
                        required
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">WhatsApp Number</label>
                    <input
                        type="text"
                        name="whatsappNumber"
                        className="form-input"
                        defaultValue={settings?.whatsappNumber || "+233 55 123 4567"}
                        required
                    />
                </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label" style={{ color: "var(--warning)", fontWeight: 600 }}>Referral Bonus Percentage (%)</label>
                <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>The percentage of a referred user's first trade value that is awarded to the referrer as Reward Points.</p>
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="referralBonusPercentage"
                    className="form-input"
                    defaultValue={settings?.referralBonusPercentage || 1.5}
                    required
                />
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label" style={{ color: "var(--success)", fontWeight: 600 }}>100 Points to Cedis Value (GHS)</label>
                <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>Determine the Cedi payout value equivalent of every 100 Reward Points.</p>
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="rewardPointsToGhs"
                    className="form-input"
                    defaultValue={settings?.rewardPointsToGhs ?? 100.0}
                    required
                />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 2rem", opacity: loading ? 0.7 : 1 }} disabled={loading}>
                    {loading ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </form>
    );
}
