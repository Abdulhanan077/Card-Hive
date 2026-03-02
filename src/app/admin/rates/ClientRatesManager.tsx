"use client";

import { useState } from "react";
import { addOrUpdateRateAction, deleteRateAction, bulkAddOrUpdateRatesAction, deleteAllRatesAction } from "@/app/actions/rates";
import { useNotification } from "@/context/NotificationContext";

type Rate = {
    id: number;
    cardBrand: string;
    cardCountry: string;
    cardType: string;
    rate: number;
    publicRate: number | null;
    updatedAt: Date;
};

const POPULAR_BRANDS = [
    "Apple/iTunes", "Amazon", "Steam", "Razer Gold", "Google Play",
    "PlayStation", "Xbox", "Roblox", "Sephora", "Nordstrom",
    "Nike", "Vanilla Visa", "Amex", "Target", "Walmart",
    "eBay", "Macy's", "JCPenney", "GameStop", "Best Buy"
];

export default function ClientRatesManager({ initialRates }: { initialRates: Rate[] }) {
    const { showNotification } = useNotification();
    const [rates, setRates] = useState<Rate[]>(initialRates);
    const [loading, setLoading] = useState(false);

    // Single Form State
    const [cardBrand, setCardBrand] = useState("");
    const [isCustomBrand, setIsCustomBrand] = useState(false);
    const [currency, setCurrency] = useState("USD");
    const [priceTag, setPriceTag] = useState("Any Amount");
    const [isCustomPrice, setIsCustomPrice] = useState(false);
    const [cardType, setCardType] = useState("Physical");
    const [rateMultiplier, setRateMultiplier] = useState("");
    const [publicRateMultiplier, setPublicRateMultiplier] = useState("");
    const [isPublicSame, setIsPublicSame] = useState(true);

    // Bulk Form State
    const [bulkBrands, setBulkBrands] = useState<string[]>(POPULAR_BRANDS);
    const [bulkCurrency, setBulkCurrency] = useState("USD");
    const [bulkPriceTag, setBulkPriceTag] = useState("Any Amount");
    const [isBulkCustomPrice, setIsBulkCustomPrice] = useState(false);
    const [bulkCardType, setBulkCardType] = useState("Physical");
    const [bulkRateMultiplier, setBulkRateMultiplier] = useState("");
    const [bulkPublicRateMultiplier, setBulkPublicRateMultiplier] = useState("");
    const [isBulkPublicSame, setIsBulkPublicSame] = useState(true);

    const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "Global"];
    const PRICE_TAGS = [
        "Any Amount",
        "$10 - $49",
        "$50 - $99",
        "$100 - $299",
        "$300 - $499",
        "$500+",
    ];

    const formatCategory = (curr: string, tag: string) => {
        if (tag === "Any Amount") return curr;
        return `${curr} (${tag})`;
    };

    const parseCategory = (savedCountry: string) => {
        let curr = "USD";
        let tag = "Any Amount";

        for (const c of CURRENCIES) {
            if (savedCountry.startsWith(c)) {
                curr = c;
                const match = savedCountry.match(/\((.*?)\)/);
                if (match && match[1]) {
                    tag = match[1];
                }
                break;
            }
        }
        return { curr, tag };
    };


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cardBrand || !currency || !rateMultiplier) return;

        setLoading(true);
        try {
            const combinedCategory = formatCategory(currency, priceTag);
            const finalPublicRate = isPublicSame ? parseFloat(rateMultiplier) : parseFloat(publicRateMultiplier);
            await addOrUpdateRateAction(cardBrand, combinedCategory, cardType, parseFloat(rateMultiplier), finalPublicRate);
            showNotification('SUCCESS', `Rate for ${cardBrand} (${combinedCategory} - ${cardType}) updated successfully.`);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error(error);
            showNotification('ERROR', "Failed to save rate configuration.");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rate: Rate) => {
        const { curr, tag } = parseCategory(rate.cardCountry);

        setCardBrand(rate.cardBrand);
        setIsCustomBrand(!POPULAR_BRANDS.includes(rate.cardBrand));
        setCurrency(curr);
        setPriceTag(tag);
        setIsCustomPrice(!PRICE_TAGS.includes(tag));
        setCardType(rate.cardType || "Physical");
        setRateMultiplier(rate.rate.toString());
        if (rate.publicRate !== null) {
            setPublicRateMultiplier(rate.publicRate.toString());
            setIsPublicSame(rate.publicRate === rate.rate);
        } else {
            setPublicRateMultiplier("");
            setIsPublicSame(true);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to completely remove this rate?")) return;

        setLoading(true);
        try {
            await deleteRateAction(id);
            showNotification('SUCCESS', "Rate removed successfully.");
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error(error);
            showNotification('ERROR', "Failed to delete rate.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to completely remove ALL active rates? This action cannot be undone.")) return;

        setLoading(true);
        try {
            await deleteAllRatesAction();
            showNotification('SUCCESS', "All active rates have been removed.");
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error(error);
            showNotification('ERROR', "Failed to delete all rates.");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBulkBrand = (brand: string) => {
        setBulkBrands(prev =>
            prev.includes(brand)
                ? prev.filter(b => b !== brand)
                : [...prev, brand]
        );
    };

    const handleBulkSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkBrands.length === 0 || !bulkCurrency || !bulkRateMultiplier) return;

        setLoading(true);
        try {
            const combinedCategory = formatCategory(bulkCurrency, bulkPriceTag);
            const finalPublicRate = isBulkPublicSame ? parseFloat(bulkRateMultiplier) : parseFloat(bulkPublicRateMultiplier);
            await bulkAddOrUpdateRatesAction(bulkBrands, combinedCategory, bulkCardType, parseFloat(bulkRateMultiplier), finalPublicRate);
            showNotification('SUCCESS', `Bulk configuration applied to ${bulkBrands.length} brands (${bulkCardType}).`);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
            console.error(error);
            showNotification('ERROR', "Failed to apply bulk configuration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-layout" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", alignItems: "start" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Add/Update Rate Form */}
                <div className="card">
                    <h3 style={{ marginBottom: "1.5rem" }}>Add or Update Rate</h3>
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Card Brand</label>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <select
                                    value={isCustomBrand ? "Other" : cardBrand}
                                    onChange={(e) => {
                                        if (e.target.value === "Other") {
                                            setIsCustomBrand(true);
                                            setCardBrand("");
                                        } else {
                                            setIsCustomBrand(false);
                                            setCardBrand(e.target.value);
                                        }
                                    }}
                                    className="form-select"
                                    required={!isCustomBrand}
                                >
                                    <option value="" disabled>Select popular brand...</option>
                                    {POPULAR_BRANDS.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                    <option value="Other" style={{ fontWeight: "bold" }}>+ Enter Custom Brand</option>
                                </select>

                                {isCustomBrand && (
                                    <input
                                        type="text"
                                        value={cardBrand}
                                        onChange={(e) => setCardBrand(e.target.value)}
                                        className="form-input"
                                        placeholder="Type custom brand name here..."
                                        required={isCustomBrand}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="form-select"
                                    required
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Price Tag (Face Value)</label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <select
                                        value={isCustomPrice ? "Other" : priceTag}
                                        onChange={(e) => {
                                            if (e.target.value === "Other") {
                                                setIsCustomPrice(true);
                                                setPriceTag("");
                                            } else {
                                                setIsCustomPrice(false);
                                                setPriceTag(e.target.value);
                                            }
                                        }}
                                        className="form-select"
                                        required={!isCustomPrice}
                                    >
                                        {PRICE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="Other" style={{ fontWeight: "bold" }}>+ Enter Custom Amount</option>
                                    </select>
                                    {isCustomPrice && (
                                        <input
                                            type="text"
                                            value={priceTag}
                                            onChange={(e) => setPriceTag(e.target.value)}
                                            className="form-input"
                                            placeholder="e.g. 50, 100, 10-50"
                                            required={isCustomPrice}
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Card Type</label>
                            <select
                                value={cardType}
                                onChange={(e) => setCardType(e.target.value)}
                                className="form-select"
                                required
                            >
                                <option value="Physical">Physical Card</option>
                                <option value="E-code">E-code (Digital)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Trading Payout Rate (multiplier)</label>
                            <input
                                type="number"
                                step="any"
                                value={rateMultiplier}
                                onChange={(e) => setRateMultiplier(e.target.value)}
                                className="form-input"
                                placeholder="e.g. 10.5"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label className="form-label">Public Display Rate</label>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isPublicSame} onChange={(e) => setIsPublicSame(e.target.checked)} />
                                    Same as Trading
                                </label>
                            </div>
                            <input
                                type="number"
                                step="any"
                                value={isPublicSame ? rateMultiplier : publicRateMultiplier}
                                onChange={(e) => setPublicRateMultiplier(e.target.value)}
                                className="form-input"
                                placeholder="Public display rate"
                                disabled={isPublicSame}
                                required={!isPublicSame}
                            />
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                                {loading ? "Saving..." : "Save Rate Config"}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setCardBrand(""); setIsCustomBrand(false); setCurrency("USD"); setPriceTag("Any Amount"); setIsCustomPrice(false); setCardType("Physical"); setRateMultiplier(""); setPublicRateMultiplier(""); setIsPublicSame(true); }} disabled={loading}>
                                Clear
                            </button>
                        </div>
                    </form>
                </div>

                {/* Bulk Update Rate Form */}
                <div className="card">
                    <h3 style={{ marginBottom: "1.5rem" }}>Bulk Configure Rates</h3>
                    <form onSubmit={handleBulkSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Currency</label>
                                <select
                                    value={bulkCurrency}
                                    onChange={(e) => setBulkCurrency(e.target.value)}
                                    className="form-select"
                                    required
                                >
                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Price Tag (Face Value)</label>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <select
                                        value={isBulkCustomPrice ? "Other" : bulkPriceTag}
                                        onChange={(e) => {
                                            if (e.target.value === "Other") {
                                                setIsBulkCustomPrice(true);
                                                setBulkPriceTag("");
                                            } else {
                                                setIsBulkCustomPrice(false);
                                                setBulkPriceTag(e.target.value);
                                            }
                                        }}
                                        className="form-select"
                                        required={!isBulkCustomPrice}
                                    >
                                        {PRICE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="Other" style={{ fontWeight: "bold" }}>+ Enter Custom Amount</option>
                                    </select>
                                    {isBulkCustomPrice && (
                                        <input
                                            type="text"
                                            value={bulkPriceTag}
                                            onChange={(e) => setBulkPriceTag(e.target.value)}
                                            className="form-input"
                                            placeholder="e.g. 50, 100, 10-50"
                                            required={isBulkCustomPrice}
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Card Type</label>
                            <select
                                value={bulkCardType}
                                onChange={(e) => setBulkCardType(e.target.value)}
                                className="form-select"
                                required
                            >
                                <option value="Physical">Physical Card</option>
                                <option value="E-code">E-code (Digital)</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Trading Payout Rate (multiplier)</label>
                            <input
                                type="number"
                                step="any"
                                value={bulkRateMultiplier}
                                onChange={(e) => setBulkRateMultiplier(e.target.value)}
                                className="form-input"
                                placeholder="e.g. 10.5"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label className="form-label">Public Display Rate</label>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isBulkPublicSame} onChange={(e) => setIsBulkPublicSame(e.target.checked)} />
                                    Same as Trading
                                </label>
                            </div>
                            <input
                                type="number"
                                step="any"
                                value={isBulkPublicSame ? bulkRateMultiplier : bulkPublicRateMultiplier}
                                onChange={(e) => setBulkPublicRateMultiplier(e.target.value)}
                                className="form-input"
                                placeholder="Public display rate"
                                disabled={isBulkPublicSame}
                                required={!isBulkPublicSame}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Brands to Apply To</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="button" onClick={() => setBulkBrands(POPULAR_BRANDS)} style={{ fontSize: '0.8em', color: 'var(--primary)', textDecoration: 'underline' }}>Select All</button>
                                    <button type="button" onClick={() => setBulkBrands([])} style={{ fontSize: '0.8em', color: 'var(--danger)', textDecoration: 'underline' }}>Clear All</button>
                                </div>
                            </label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxHeight: "250px", overflowY: "auto", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: "var(--background)" }}>
                                {POPULAR_BRANDS.map(brand => (
                                    <label key={brand} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={bulkBrands.includes(brand)}
                                            onChange={() => handleToggleBulkBrand(brand)}
                                        />
                                        {brand}
                                    </label>
                                ))}
                            </div>
                            <small style={{ opacity: 0.6, fontSize: "0.8em" }}>{bulkBrands.length} brands selected.</small>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.5rem" }} disabled={loading || bulkBrands.length === 0}>
                            {loading ? "Saving..." : "Apply Bulk Config"}
                        </button>
                    </form>
                </div>

            </div>

            {/* Current Rates Table */}
            <div className="card" style={{ height: "calc(100% - 2rem)", maxHeight: "800px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "sticky", top: 0, backgroundColor: "var(--background)", zIndex: 10, paddingBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h3 style={{ margin: 0 }}>Active Rates</h3>
                    {rates.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            disabled={loading}
                            style={{ backgroundColor: "var(--danger)", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold", marginLeft: "auto" }}
                        >
                            Remove All Rates
                        </button>
                    )}
                </div>
                {rates.length === 0 ? (
                    <p style={{ opacity: 0.6 }}>No custom rates have been configured yet.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table data-table w-full" style={{ textAlign: "left", width: "100%" }}>
                            <thead style={{ position: "sticky", top: "40px", backgroundColor: "var(--bg-alt)", zIndex: 10 }}>
                                <tr>
                                    <th>Brand</th>
                                    <th>Currency / Category</th>
                                    <th>Type</th>
                                    <th>Trading Rate</th>
                                    <th>Public Rate</th>
                                    <th style={{ textAlign: "right", paddingRight: "1rem" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rates.map(rate => (
                                    <tr key={rate.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ fontWeight: 600, padding: "0.75rem" }}>{rate.cardBrand}</td>
                                        <td style={{ padding: "0.75rem" }}>
                                            <span style={{ backgroundColor: "var(--bg-alt)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.9em" }}>
                                                {rate.cardCountry}
                                            </span>
                                        </td>
                                        <td style={{ padding: "0.75rem" }}>
                                            <span style={{ backgroundColor: rate.cardType === 'E-code' ? 'var(--blue-light, #e0f2fe)' : 'var(--green-light, #dcfce7)', color: rate.cardType === 'E-code' ? 'var(--blue-dark, #0284c7)' : 'var(--green-dark, #166534)', padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.85em" }}>
                                                {rate.cardType || "Physical"}
                                            </span>
                                        </td>
                                        <td style={{ color: "var(--primary)", fontWeight: 700, padding: "0.75rem" }}>{rate.rate}x</td>
                                        <td style={{ padding: "0.75rem" }}>
                                            {rate.publicRate !== null ? (
                                                <span style={{ color: rate.publicRate !== rate.rate ? "#d97706" : "inherit", fontWeight: rate.publicRate !== rate.rate ? 600 : 400 }}>
                                                    {rate.publicRate}x
                                                </span>
                                            ) : (
                                                <span style={{ opacity: 0.5 }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "right", padding: "0.75rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                            <button
                                                onClick={() => handleEdit(rate)}
                                                style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", textDecoration: "underline" }}
                                                disabled={loading}
                                            >
                                                Edit
                                            </button>
                                            <span style={{ opacity: 0.3 }}>|</span>
                                            <button
                                                onClick={() => handleDelete(rate.id)}
                                                style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", textDecoration: "underline" }}
                                                disabled={loading}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
