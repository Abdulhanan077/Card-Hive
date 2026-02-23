"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./sell.module.css";

export default function SellGiftCardPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);

    // Rate Calculator State
    const [rates, setRates] = useState<{ cardBrand: string, cardCountry: string, rate: number }[]>([]);
    const [cardBrand, setCardBrand] = useState("");
    const [cardCategory, setCardCategory] = useState("");
    const [faceValue, setFaceValue] = useState("");
    const [estimatedPayout, setEstimatedPayout] = useState<number | null>(null);

    // Fetch Rates on Mount
    useEffect(() => {
        fetch("/api/rates").then(res => res.json()).then(data => {
            if (data.rates) setRates(data.rates);
        }).catch(err => console.error("Failed to load rates:", err));
    }, []);

    // Get Unique Brands configured by Admin
    const availableBrands = Array.from(new Set(rates.map(r => r.cardBrand)));

    // Get Categories (Country/PriceTag) specifically available for the selected Brand
    const availableCategories = rates
        .filter(r => r.cardBrand === cardBrand)
        .map(r => r.cardCountry);

    // Automatically select first category if brand changes and categories exist
    useEffect(() => {
        if (availableCategories.length > 0 && !availableCategories.includes(cardCategory)) {
            setCardCategory(availableCategories[0]);
        } else if (availableCategories.length === 0) {
            setCardCategory("");
        }
    }, [cardBrand, availableCategories, cardCategory]);

    // Recalculate anytime inputs change
    useEffect(() => {
        const value = parseFloat(faceValue);
        if (!cardBrand || !cardCategory || isNaN(value)) {
            setEstimatedPayout(null);
            return;
        }

        const activeRate = rates.find(r => r.cardBrand === cardBrand && r.cardCountry === cardCategory);
        if (activeRate) {
            setEstimatedPayout(value * activeRate.rate);
        } else {
            setEstimatedPayout(null);
        }
    }, [cardBrand, cardCategory, faceValue, rates]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);

        // Map the new single category back to the expected API fields
        formData.set("cardCountry", cardCategory);
        // Extract base currency from category e.g. "USD ($10-49)" -> "USD"
        const extractedCurrency = cardCategory.split(' ')[0] || "USD";
        formData.set("currency", extractedCurrency);

        // Append files manually to ensure array format
        formData.delete("images");
        files.forEach(file => {
            formData.append("images", file);
        });

        try {
            const res = await fetch("/api/trades", {
                method: "POST",
                body: formData, // FormData automatically sets multipart/form-data
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to submit trade");
            }

            router.push(`/user/success?tradeId=${data.tradeId}`);
        } catch (err: any) {
            setError(err.message);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className="dashboard-title">Sell Your Gift Card</h1>
                <p className="dashboard-subtitle">Fill in the details below to submit your card for review and instant payout.</p>
            </div>

            <div className="card" style={{ maxWidth: '800px' }}>
                {error && (
                    <div className={styles.errorMessage}>
                        <strong>Submission Error:</strong> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.formGrid}>
                    {/* Payout Information */}
                    <div className={styles.formSection}>
                        <h3>1. Payout Information</h3>
                        <div className={styles.grid2}>
                            <div className="form-group">
                                <label className="form-label">Payout Network</label>
                                <select name="payoutNetwork" className="form-select" required>
                                    <option value="">Select Network...</option>
                                    <option value="MTN">MTN Mobile Money</option>
                                    <option value="Telecel">Telecel Cash</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mobile Money Number</label>
                                <input type="tel" name="payoutPhoneNumber" className="form-input" required placeholder="055 123 4567" />
                            </div>
                        </div>
                    </div>

                    <hr className={styles.divider} />

                    {/* Card Details */}
                    <div className={styles.formSection}>
                        <h3>2. Gift Card Details</h3>

                        <div className={styles.grid2}>
                            <div className="form-group">
                                <label className="form-label">Card Brand</label>
                                <select
                                    name="cardBrand"
                                    className="form-select"
                                    required
                                    value={cardBrand}
                                    onChange={(e) => setCardBrand(e.target.value)}
                                >
                                    <option value="">Select Brand...</option>
                                    {availableBrands.map(brand => (
                                        <option key={brand} value={brand}>{brand}</option>
                                    ))}
                                    {/* Fallback option if user has a brand not listed in rates */}
                                    {!availableBrands.includes("Other") && <option value="Other">Other (Manual Review)</option>}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Currency & Category</label>
                                <select
                                    className="form-select"
                                    required
                                    value={cardCategory}
                                    onChange={(e) => setCardCategory(e.target.value)}
                                    disabled={!cardBrand || availableCategories.length === 0}
                                >
                                    {cardBrand && availableCategories.length === 0 ? (
                                        <option value="">No rates available for {cardBrand}</option>
                                    ) : (
                                        <>
                                            <option value="">Select Category...</option>
                                            {availableCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                            {cardBrand === "Other" && <option value="Manual">Manual Entry</option>}
                                        </>
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className={styles.grid2}>
                            <div className="form-group">
                                <label className="form-label">Type</label>
                                <select name="cardType" className="form-select" required>
                                    <option value="Physical">Physical Card</option>
                                    <option value="E-code">E-code (Digital)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Exact Face Value Amount</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="faceValue"
                                    className="form-input"
                                    required
                                    placeholder="e.g. 50"
                                    value={faceValue}
                                    onChange={(e) => setFaceValue(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Dynamic Payout Calculator Display */}
                        {estimatedPayout !== null ? (
                            <div style={{ padding: "1rem", backgroundColor: "var(--bg-alt)", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontWeight: 500, opacity: 0.8 }}>Estimated Payout:</span>
                                <span style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--primary)" }}>GH₵ {estimatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        ) : cardBrand && faceValue ? (
                            <div style={{ padding: "1rem", backgroundColor: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", marginBottom: "1.5rem", color: "#d97706" }}>
                                <span>No current automated rate found. Final payout will be evaluated by an Admin upon submission.</span>
                            </div>
                        ) : null}

                        <div className="form-group">
                            <label className="form-label">Card Code / PIN (Required)</label>
                            <input type="text" name="cardCode" className="form-input" required placeholder="Exact code to redeem" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }} />
                            <p className={styles.helpText}>Enter the exact alphanumeric code. This is strictly checked for duplicates.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Serial Number (Optional)</label>
                            <input type="text" name="serialNumber" className="form-input" placeholder="Often found near the barcode" />
                        </div>
                    </div>

                    <hr className={styles.divider} />

                    {/* Uploads */}
                    <div className={styles.formSection}>
                        <h3>3. Evidence & Media</h3>
                        <div className="form-group">
                            <label className="form-label">Upload Card Images & Receipt</label>
                            <div className={styles.fileUpload}>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} className={styles.fileInput} />
                                <div className={styles.fileLabel}>
                                    <span style={{ fontSize: '2rem' }}>📸</span>
                                    <p>Click to browse or drag and drop images here.</p>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{files.length > 0 ? `${files.length} file(s) selected` : 'Front, back, and receipt required for physical cards.'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Additional Notes (Optional)</label>
                            <textarea name="notes" className="form-textarea" rows={3} placeholder="Any extra information the admin should know..."></textarea>
                        </div>
                    </div>

                    <div className={styles.consentBox}>
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" required className={styles.checkbox} />
                            <span>I confirm I am the rightful owner of this gift card, it has not been used, and all details provided are accurate.</span>
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading}>
                            {loading ? "Processing Securely..." : "Submit Gift Card"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
