"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./sell.module.css";
import { useNotification } from "@/context/NotificationContext";
import { sortCategories, validateCategoryAmount, getExactCategoryAmount, formatCategoryWithFlag } from "@/lib/categoryUtils";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

interface CardEntry {
    id: string;
    cardBrand: string;
    cardCategory: string;
    cardType: string;
    faceValue: string;
    faceValueError: string;
    estimatedPayout: number | null;
    cardCode: string;
    serialNumber: string;
}

export default function SellGiftCardPage() {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);

    // Global Rates State
    const [rates, setRates] = useState<{ cardBrand: string, cardCountry: string, cardType?: string, rate: number }[]>([]);
    const [usdtRate, setUsdtRate] = useState<number>(15.0);

    // Multiple Cards State
    const [cards, setCards] = useState<CardEntry[]>([
        {
            id: Math.random().toString(36).substr(2, 9),
            cardBrand: "",
            cardCategory: "",
            cardType: "Physical",
            faceValue: "",
            faceValueError: "",
            estimatedPayout: null,
            cardCode: "",
            serialNumber: ""
        }
    ]);

    // Payout Method State (Common for all cards in the batch)
    const [payoutMethod, setPayoutMethod] = useState<"MOBILE_MONEY" | "CRYPTO">("MOBILE_MONEY");
    const [payoutNetwork, setPayoutNetwork] = useState("");
    const [cryptoCoin, setCryptoCoin] = useState<"USDT">("USDT");
    const [cryptoNetwork, setCryptoNetwork] = useState("TRC20");
    const [cryptoExchange, setCryptoExchange] = useState("");
    const [cryptoReceiverIdType, setCryptoReceiverIdType] = useState<"WALLET_ADDRESS" | "EXCHANGE_ID">("EXCHANGE_ID");

    // Fetch Rates on Mount
    useEffect(() => {
        fetch("/api/rates").then(res => res.json()).then(data => {
            if (data.rates) setRates(data.rates);
            if (data.usdtExchangeRate) setUsdtRate(data.usdtExchangeRate);
        }).catch(err => console.error("Failed to load rates:", err));
    }, []);

    // Cleanup object URLs for previews
    useEffect(() => {
        return () => filePreviews.forEach(URL.revokeObjectURL);
    }, [filePreviews]);

    const availableBrands = Array.from(new Set(rates.map((r: { cardBrand: string }) => r.cardBrand)));

    const addCard = () => {
        setCards([...cards, {
            id: Math.random().toString(36).substr(2, 9),
            cardBrand: "",
            cardCategory: "",
            cardType: "Physical",
            faceValue: "",
            faceValueError: "",
            estimatedPayout: null,
            cardCode: "",
            serialNumber: ""
        }]);
    };

    const removeCard = (id: string) => {
        if (cards.length > 1) {
            setCards(cards.filter(c => c.id !== id));
        }
    };

    const updateCard = (id: string, updates: Partial<CardEntry>) => {
        setCards((prevCards: CardEntry[]) => prevCards.map((card: CardEntry) => {
            if (card.id !== id) return card;

            const updatedCard = { ...card, ...updates };

            // Auto-fill exact face value
            if (updates.cardCategory !== undefined && updates.cardCategory !== card.cardCategory) {
                const exact = getExactCategoryAmount(updates.cardCategory);
                if (exact !== null) {
                    updatedCard.faceValue = exact.toString();
                    updates.faceValue = exact.toString(); // Ensure logic below uses it
                } else if (getExactCategoryAmount(card.cardCategory) !== null) {
                    // Reset if changing from exact to non-exact
                    updatedCard.faceValue = "";
                    updates.faceValue = "";
                }
            }

            // Recalculate if relevant fields changed
            if (updates.cardBrand || updates.cardCategory || updates.cardType || updates.faceValue !== undefined) {
                const value = parseFloat(updatedCard.faceValue);
                updatedCard.faceValueError = "";

                if (!updatedCard.cardBrand || !updatedCard.cardCategory || isNaN(value)) {
                    updatedCard.estimatedPayout = null;
                } else {
                    // Validate face value against category
                    updatedCard.faceValueError = validateCategoryAmount(value, updatedCard.cardCategory);

                    const activeRate = rates.find(r =>
                        r.cardBrand === updatedCard.cardBrand &&
                        r.cardCountry === updatedCard.cardCategory &&
                        (r.cardType === updatedCard.cardType || (!r.cardType && updatedCard.cardType === "Physical"))
                    );

                    if (activeRate && !updatedCard.faceValueError) {
                        updatedCard.estimatedPayout = value * activeRate.rate;
                    } else {
                        updatedCard.estimatedPayout = null;
                    }
                }
            }

            return updatedCard;
        }));
    };

    const totalPayout = cards.reduce((sum: number, card: CardEntry) => sum + (card.estimatedPayout || 0), 0);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            const previews = selectedFiles.map(file => URL.createObjectURL(file));
            setFilePreviews(previews);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Check for errors in any card
        const firstError = cards.find((c: CardEntry) => c.faceValueError)?.faceValueError;
        if (firstError) {
            setError(firstError);
            showNotification('ERROR', firstError);
            setLoading(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        const formData = new FormData(e.currentTarget);

        // Prepare cards data for API
        const cardsData = cards.map((c: CardEntry) => {
            const extractedCurrency = c.cardCategory.split(' ')[0] || "USD";
            return {
                cardBrand: c.cardBrand,
                cardCountry: c.cardCategory,
                cardType: c.cardType,
                faceValue: parseFloat(c.faceValue),
                currency: extractedCurrency,
                cardCode: c.cardCode,
                serialNumber: c.serialNumber
            };
        });

        formData.set("cards", JSON.stringify(cardsData));
        formData.set("payoutNetwork", payoutNetwork);

        if (payoutMethod === "CRYPTO") {
            formData.set("cryptoNetwork", cryptoNetwork);
            formData.set("cryptoExchange", cryptoExchange);
            formData.set("cryptoReceiverIdType", cryptoReceiverIdType);
        }

        // --- New Direct Upload Strategy for Web ---
        const uploadedUrls = await Promise.all(
            files.map(async (file) => {
                try {
                    // 1. Get presigned URL
                    const presignedRes = await fetch("/api/uploads/presigned", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
                    });
                    if (!presignedRes.ok) return null;
                    const { uploadUrl, publicUrl } = await presignedRes.json();

                    // 2. Upload directly to R2
                    const uploadRes = await fetch(uploadUrl, {
                        method: "PUT",
                        body: file,
                        headers: { "Content-Type": file.type },
                    });

                    return uploadRes.ok ? publicUrl : null;
                } catch (e) {
                    console.error("Direct upload failed for", file.name, e);
                    return null;
                }
            })
        );

        // Filter out any failed uploads and add to formData
        const finalUrls = uploadedUrls.filter(url => url !== null);
        formData.set("preUploadedUrls", JSON.stringify(finalUrls));

        // Remove the binary images from formData to keep the payload small
        formData.delete("images");

        try {
            const res = await fetch("/api/trades", {
                method: "POST",
                body: formData,
            });

            const contentType = res.headers.get("content-type");
            let data: any = {};
            
            if (contentType && contentType.includes("application/json")) {
                data = await res.json();
            } else {
                // Read text to prevent "the string did not match the expected pattern" or "Unexpected token <"
                await res.text();
                throw new Error(res.status === 504 
                    ? "Trade submitted, but the server timed out while sending confirmation emails. Please check your trades history." 
                    : `Server Error (${res.status}): Something went wrong.`);
            }

            if (!res.ok) throw new Error(data.message || "Failed to submit trade");

            showNotification('SUCCESS', `Successfully submitted ${cards.length} gift cards!`);
            router.push(`/user/success?tradeId=${data.tradeId}`);
        } catch (err: any) {
            setError(err.message);
            showNotification('ERROR', err.message);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className="dashboard-title">Sell Your Gift Cards</h1>
                <p className="dashboard-subtitle">List one or more cards below to submit them for review and instant payout.</p>
            </div>

            <div className="card" style={{ maxWidth: '900px' }}>
                {error && (
                    <div className={styles.errorMessage}>
                        <strong>Submission Error:</strong> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.formGrid}>
                    {/* Payout Information */}
                    <div className={styles.formSection}>
                        <h3>1. Payout Information</h3>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label">Select Payout Method</label>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', flex: 1, backgroundColor: payoutMethod === 'MOBILE_MONEY' ? 'var(--bg-alt)' : 'transparent', borderColor: payoutMethod === 'MOBILE_MONEY' ? 'var(--primary)' : 'var(--border)' }}>
                                    <input type="radio" name="payoutMethod" value="MOBILE_MONEY" checked={payoutMethod === 'MOBILE_MONEY'} onChange={() => setPayoutMethod('MOBILE_MONEY')} />
                                    <span>Mobile Money</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px', flex: 1, backgroundColor: payoutMethod === 'CRYPTO' ? 'var(--bg-alt)' : 'transparent', borderColor: payoutMethod === 'CRYPTO' ? 'var(--primary)' : 'var(--border)' }}>
                                    <input type="radio" name="payoutMethod" value="CRYPTO" checked={payoutMethod === 'CRYPTO'} onChange={() => setPayoutMethod('CRYPTO')} />
                                    <span>Crypto (USDT)</span>
                                </label>
                            </div>
                        </div>

                        {payoutMethod === 'MOBILE_MONEY' ? (
                            <div className={styles.grid2}>
                                <div className="form-group">
                                    <label className="form-label">Payout Network</label>
                                    <SearchableCategorySelect
                                        className="form-select"
                                        required={payoutMethod === 'MOBILE_MONEY'}
                                        placeholder="Select Network..."
                                        categories={["MTN", "Telecel"]}
                                        value={payoutNetwork}
                                        onChange={(val) => setPayoutNetwork(val)}
                                        showSearch={false}
                                    />
                                    <input type="hidden" name="payoutNetwork" value={payoutNetwork} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mobile Money Number</label>
                                    <input type="tel" name="payoutPhoneNumber" className="form-input" required={payoutMethod === 'MOBILE_MONEY'} placeholder="055 123 4567" />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Account Name</label>
                                    <input type="text" name="payoutAccountName" className="form-input" required={payoutMethod === 'MOBILE_MONEY'} placeholder="Enter the registered name on this account" />
                                </div>
                            </div>
                        ) : (
                            <div className={styles.cryptoSection} style={{ padding: '1.5rem', backgroundColor: 'var(--bg-alt)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div className={styles.grid2}>
                                    <div className="form-group">
                                        <label className="form-label">Select Coin</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <button type="button" className={`btn btn-primary`} style={{ flex: 1, cursor: 'default' }}>USDT</button>
                                            <input type="hidden" name="cryptoCoin" value="USDT" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Network</label>
                                        <SearchableCategorySelect
                                            className="form-select"
                                            required={true}
                                            value={cryptoNetwork}
                                            onChange={(val) => setCryptoNetwork(val)}
                                            categories={["TRC20", "BEP20"]}
                                            showSearch={false}
                                        />
                                        <input type="hidden" name="cryptoNetwork" value={cryptoNetwork} />
                                    </div>
                                </div>

                                <div className={styles.grid2} style={{ marginTop: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Exchange</label>
                                        <SearchableCategorySelect
                                            className="form-select"
                                            required={true}
                                            value={cryptoExchange}
                                            onChange={(val) => setCryptoExchange(val)}
                                            categories={["NOONES", "BINANCE", "OKX", "BYBIT", "KUCOIN", "OTHER"]}
                                            placeholder="Select Exchange..."
                                            searchPlaceholder="Search exchange..."
                                        />
                                        <input type="hidden" name="cryptoExchange" value={cryptoExchange} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Receiving Method</label>
                                        <SearchableCategorySelect
                                            className="form-select"
                                            required={true}
                                            value={cryptoReceiverIdType}
                                            onChange={(val) => setCryptoReceiverIdType(val as any)}
                                            categories={["EXCHANGE_ID", "WALLET_ADDRESS"]}
                                            showSearch={false}
                                        />
                                        <input type="hidden" name="cryptoReceiverIdType" value={cryptoReceiverIdType} />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">Account Identifer</label>
                                    <input
                                        type="text"
                                        name="cryptoReceiverId"
                                        className="form-input"
                                        required
                                        placeholder="Wallet Address or ID"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className={styles.divider} />

                    {/* Card Details Section */}
                    <div className={styles.formSection}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>2. Gift Cards to Trade</h3>
                            <button type="button" onClick={addCard} className="btn" style={{ backgroundColor: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>➕</span> Add Another Card
                            </button>
                        </div>

                        {cards.map((card, index) => {
                            const availableCategories = Array.from(new Set(
                                rates
                                    .filter((r: { cardBrand: string, cardType?: string }) => r.cardBrand === card.cardBrand && (r.cardType === card.cardType || (!r.cardType && card.cardType === "Physical")))
                                    .map((r: { cardCountry: string }) => r.cardCountry)
                            )).sort(sortCategories);

                            return (
                                <div key={card.id} className={styles.cardItem} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', backgroundColor: 'var(--bg)' }}>
                                    {cards.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeCard(card.id)}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.6 }}
                                            title="Remove card"
                                        >
                                            ❌
                                        </button>
                                    )}
                                    <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--primary)' }}>Card #{index + 1}</div>

                                    <div className={styles.grid2}>
                                        <div className="form-group">
                                            <label className="form-label">Card Brand</label>
                                            <SearchableCategorySelect
                                                className="form-select"
                                                required={true}
                                                value={card.cardBrand}
                                                onChange={(val) => updateCard(card.id, { cardBrand: val, cardCategory: "" })}
                                                categories={availableBrands.includes("Other") ? availableBrands : [...availableBrands, "Other"]}
                                                placeholder="Select Brand..."
                                                searchPlaceholder="Search brands..."
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Type</label>
                                            <SearchableCategorySelect
                                                className="form-select"
                                                required={true}
                                                value={card.cardType}
                                                onChange={(val) => updateCard(card.id, { cardType: val })}
                                                categories={["Physical", "E-code"]}
                                                showSearch={false}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className="form-group">
                                            <label className="form-label">Currency & Category</label>
                                            {card.cardBrand && availableCategories.length === 0 && card.cardBrand !== "Other" ? (
                                                <select className="form-select" disabled>
                                                    <option>No rates available</option>
                                                </select>
                                            ) : (
                                                <SearchableCategorySelect
                                                    className="form-select"
                                                    required={true}
                                                    value={card.cardCategory}
                                                    onChange={(val) => updateCard(card.id, { cardCategory: val })}
                                                    categories={(card.cardBrand === "Other" ? [...availableCategories, "Manual Entry"] : availableCategories).map(cat => ({
                                                        value: cat,
                                                        label: cat,
                                                        display: formatCategoryWithFlag(cat)
                                                    }))}
                                                    placeholder="Select Category..."
                                                    disabled={!card.cardBrand}
                                                    searchPlaceholder="Type amount to filter..."
                                                />
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Exact Face Value Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input"
                                                required
                                                placeholder="e.g. 50"
                                                value={card.faceValue}
                                                onChange={(e) => updateCard(card.id, { faceValue: e.target.value })}
                                                readOnly={getExactCategoryAmount(card.cardCategory) !== null}
                                                style={getExactCategoryAmount(card.cardCategory) !== null ? { backgroundColor: 'var(--bg-alt, #f3f4f6)', cursor: 'not-allowed', color: 'var(--foreground)' } : {}}
                                            />
                                            {card.faceValueError && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.4rem" }}>{card.faceValueError}</p>}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Card Code / PIN</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            required
                                            placeholder="Enter card code"
                                            value={card.cardCode}
                                            onChange={(e) => updateCard(card.id, { cardCode: e.target.value })}
                                            style={{ fontFamily: 'monospace' }}
                                        />
                                    </div>

                                    {card.estimatedPayout !== null && (
                                        <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
                                            Estimated Card Payout: GH₵ {card.estimatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {totalPayout > 0 && (
                            <div style={{ padding: "1.5rem", backgroundColor: "var(--primary-light, #f0fdf4)", borderRadius: "12px", border: "2px solid var(--primary)", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>Total Estimated Payout ({cards.length} cards)</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>GH₵ {totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                                {payoutMethod === "CRYPTO" && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 500 }}>Approx. USDT</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>≈ {(totalPayout / usdtRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <hr className={styles.divider} />

                    {/* Uploads */}
                    <div className={styles.formSection}>
                        <h3>3. Evidence & Media</h3>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '1rem' }}>Upload images (front/back) and receipts for all cards listed above.</p>
                        <div className="form-group">
                            <div className={styles.fileUpload}>
                                <input type="file" id="images" multiple accept="image/*" onChange={handleFileChange} className={styles.fileInput} />
                                <label htmlFor="images" className={styles.fileLabel}>
                                    {filePreviews.length > 0 ? (
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            {filePreviews.map((preview: string, index: number) => (
                                                <img key={index} src={preview} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                                            ))}
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '2rem' }}>📸</span>
                                            <p>Click to upload proof for all cards</p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>


                    </div>

                    <div className={styles.consentBox}>
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" required className={styles.checkbox} />
                            <span>I confirm I own these cards and all details are accurate.</span>
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading} style={{ width: '100%', padding: '1.25rem' }}>
                            {loading ? "Processing Securely..." : `Submit ${cards.length} Trade${cards.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
