"use client";

import { useState } from "react";
import { saveSettings } from "./actions";
import { useNotification } from "@/context/NotificationContext";
import ThemeToggle from "@/components/ThemeToggle";

export default function ClientSettingsForm({ settings }: { settings: any }) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(settings?.isReviewMode || false);

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
            <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', background: 'var(--card-bg)' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb' }}>
                    <span>🛡️</span> Compliance & App Store Review
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Enable this during Apple/Google review to hide trading features and external links.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: isReviewMode ? 'rgba(37, 99, 235, 0.08)' : 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid', borderColor: isReviewMode ? '#2563eb' : 'transparent', transition: 'all 0.3s ease' }}>
                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                        <input 
                            type="checkbox" 
                            name="isReviewMode" 
                            checked={isReviewMode}
                            onChange={(e) => setIsReviewMode(e.target.checked)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="slider round" style={{ 
                            position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                            backgroundColor: isReviewMode ? '#2563eb' : '#cbd5e1', transition: '.4s', borderRadius: '34px' 
                        }}>
                            <span style={{
                                position: 'absolute', content: '""', height: '18px', width: '18px', left: isReviewMode ? '28px' : '4px', bottom: '4px',
                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}></span>
                        </span>
                    </label>
                    <div onClick={() => setIsReviewMode(!isReviewMode)} style={{ cursor: 'pointer', flex: 1 }}>
                        <span style={{ fontWeight: 'bold', display: 'block', fontSize: '0.95rem', color: isReviewMode ? '#2563eb' : 'var(--text)' }}>
                            {isReviewMode ? "Review Mode Active" : "Review Mode Inactive"}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Terminology: {isReviewMode ? "Verification & Assets" : "Standard Trading"}
                        </span>
                    </div>
                </div>
            </div>

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
                    defaultValue={settings?.siteName || "MyCardHive Trading Center"}
                    required
                />
            </div>

            <div className="responsive-grid" style={{ gap: "1.5rem" }}>
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

