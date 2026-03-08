"use client";

import { useState } from "react";
import { saveSettings } from "./actions";
import { useNotification } from "@/context/NotificationContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function ClientSettingsForm({ settings }: { settings: any }) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            await saveSettings(formData);
            showNotification('SUCCESS', 'Settings saved successfully!');
        } catch (error) {
            console.error(error);
            showNotification('ERROR', 'Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🌓</span> Application Appearance
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Personalize your dashboard theme.
                </p>
                <div style={{ maxWidth: '300px' }}>
                    <ThemeToggle />
                </div>
            </div>

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

            <div className="form-group" style={{ marginTop: "1rem" }}>
                <label className="form-label" style={{ color: "var(--primary)", fontWeight: 600 }}>USDT Exchange Rate (GHS per 1 USDT)</label>
                <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>The rate used to convert GHS payouts to USDT. (e.g. 15.0)</p>
                <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="usdtExchangeRate"
                    className="form-input"
                    defaultValue={settings?.usdtExchangeRate ?? 15.0}
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
