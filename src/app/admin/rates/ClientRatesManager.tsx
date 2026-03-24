"use client";

import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";
import { 
    addOrUpdateRateAction, 
    deleteRateAction, 
    bulkAddOrUpdateRatesAction, 
    deleteAllRatesAction 
} from "@/app/actions/rates";

const POPULAR_BRANDS = [
    "Amazon", "Apple/iTunes", "ebay", "Google Play", "Nordstrom",
    "Razer Gold", "Sephora", "Steam", "Vanilla Visa", "Walmart", "Amex", 
    "Footlocker", "Macy's", "Nike", "Xbox", "PlayStation", "Roblox", "Target", 
    "JCPenney", "GameStop", "Best Buy"
].sort();

const BRAND_OPTIONS = [
    ...POPULAR_BRANDS.map(b => ({ value: b, label: b })),
    { value: "Other", label: "+ Enter Custom Brand" }
];

const CURRENCIES = ["Global", "USD", "GBP", "EUR", "AUD", "CAD", "CHF"];
const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: c }));

const PRICE_TAGS = [
    "Any Amount", "10-49", "50", "51-99", "100", "101-149", "150", "151-199", "200", 
    "201-249", "250", "251-299", "300", "301-349", "350", "351-399", "400", "401-449", "450", "451-499", "500+"
];
const PRICE_TAG_OPTIONS = [
    ...PRICE_TAGS.map(t => ({ value: t, label: t })),
    { value: "Other", label: "+ Custom" }
];

const CARD_TYPE_OPTIONS = [
    { value: "Physical", label: "Physical" },
    { value: "E-code", label: "E-code" }
];

type Rate = {
    id: number;
    cardBrand: string;
    cardCountry: string; // Used for face value/price tag in this context
    cardType: string;
    rate: number;
    publicRate: number | null;
};

export default function ClientRatesManager({ initialRates }: { initialRates: Rate[] }) {
    const [rates, setRates] = useState<Rate[]>(initialRates);
    const [loading, setLoading] = useState(false);

    // Form states
    const [cardBrand, setCardBrand] = useState("");
    const [isCustomBrand, setIsCustomBrand] = useState(false);
    const [currency, setCurrency] = useState("USD");
    const [priceTag, setPriceTag] = useState("Any Amount");
    const [isCustomPrice, setIsCustomPrice] = useState(false);
    const [cardType, setCardType] = useState("Physical");
    const [rateMultiplier, setRateMultiplier] = useState("");
    const [publicRateMultiplier, setPublicRateMultiplier] = useState("");
    const [isPublicSame, setIsPublicSame] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Bulk states
    const [bulkCurrency, setBulkCurrency] = useState("USD");
    const [bulkPriceTag, setBulkPriceTag] = useState("Any Amount");
    const [isBulkCustomPrice, setIsBulkCustomPrice] = useState(false);
    const [bulkCardType, setBulkCardType] = useState("Physical");
    const [bulkRateMultiplier, setBulkRateMultiplier] = useState("");
    const [bulkPublicRateMultiplier, setBulkPublicRateMultiplier] = useState("");
    const [isBulkPublicSame, setIsBulkPublicSame] = useState(true);
    const [bulkBrands, setBulkBrands] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Helper to format cardCountry (Category) string
    const formatCardCountry = (curr: string, tag: string) => {
        if (tag === "Any Amount") return tag;
        if (curr === "Global") return `Global (${tag})`;
        // Check if there's a symbol to use
        const symbol = curr === 'USD' ? '$' : curr === 'GBP' ? '£' : curr === 'EUR' ? '€' : '';
        return `${curr} (${symbol}${tag})`;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const formattedCountry = formatCardCountry(currency, priceTag);

        try {
            await addOrUpdateRateAction(
                cardBrand,
                formattedCountry,
                cardType,
                parseFloat(rateMultiplier),
                isPublicSame ? undefined : parseFloat(publicRateMultiplier)
            );

            toast.success(editingId ? "Rate updated!" : "Rate added!");
            
            // Refresh local list (since it's a server component parent, we might need to manually update state if not re-fetching)
            // For now, we update local state for immediate feedback
            const newRate: Rate = {
                id: editingId || Date.now(),
                cardBrand,
                cardCountry: formattedCountry,
                cardType,
                rate: parseFloat(rateMultiplier),
                publicRate: isPublicSame ? null : parseFloat(publicRateMultiplier)
            };

            if (editingId) {
                setRates(rates.map(r => r.id === editingId ? newRate : r));
            } else {
                setRates([...rates, newRate]);
            }

            // Reset form
            setCardBrand("");
            setRateMultiplier("");
            setPublicRateMultiplier("");
            setIsPublicSame(true);
            setEditingId(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to save rate.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkBrands.length === 0) return;
        setLoading(true);

        const formattedCountry = formatCardCountry(bulkCurrency, bulkPriceTag);

        try {
            await bulkAddOrUpdateRatesAction(
                bulkBrands,
                formattedCountry,
                bulkCardType,
                parseFloat(bulkRateMultiplier),
                isBulkPublicSame ? undefined : parseFloat(bulkPublicRateMultiplier)
            );

            toast.success(`Updated ${bulkBrands.length} brands!`);
            
            // Update local state for all selected brands
            const updatedRates = [...rates];
            bulkBrands.forEach(brand => {
                const newRate: Rate = {
                    id: Math.random(), // fallback ID
                    cardBrand: brand,
                    cardCountry: formattedCountry,
                    cardType: bulkCardType,
                    rate: parseFloat(bulkRateMultiplier),
                    publicRate: isBulkPublicSame ? null : parseFloat(bulkPublicRateMultiplier)
                };
                
                const existingIdx = updatedRates.findIndex(r => r.cardBrand === brand && r.cardCountry === formattedCountry && r.cardType === bulkCardType);
                if (existingIdx >= 0) updatedRates[existingIdx] = { ...updatedRates[existingIdx], ...newRate };
                else updatedRates.push(newRate);
            });
            setRates(updatedRates);
            setBulkBrands([]);
        } catch (err: any) {
            toast.error(err.message || "Bulk update failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this rate?")) return;
        setLoading(true);
        try {
            await deleteRateAction(id);
            setRates(rates.filter(r => r.id !== id));
            toast.success("Rate deleted.");
        } catch (err) {
            toast.error("Delete failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to REMOVE ALL RATES? This will clear the entire rates table!")) return;
        setLoading(true);
        try {
            await deleteAllRatesAction();
            setRates([]);
            toast.success("All rates removed.");
        } catch (err) {
            toast.error("Failed to clear rates.");
        } finally {
            setLoading(false);
        }
    };

    const filteredRates = useMemo(() => {
        if (!searchQuery.trim()) return rates;
        const q = searchQuery.toLowerCase();
        return rates.filter(r => 
            r.cardBrand.toLowerCase().includes(q) || 
            r.cardCountry.toLowerCase().includes(q)
        );
    }, [rates, searchQuery]);

    const handleEdit = (rate: Rate) => {
        setEditingId(rate.id);
        setCardBrand(rate.cardBrand);
        
        // Try to parse back price tag from cardCountry (e.g., "USD ($100)" -> "100")
        const match = rate.cardCountry.match(/\((?:\$|£|€)?([\d+-]+)\)/);
        if (match) {
            setPriceTag(match[1]);
            setIsCustomPrice(!PRICE_TAGS.includes(match[1]));
            
            // Extract currency too
            const curr = rate.cardCountry.split(' ')[0];
            if (CURRENCIES.includes(curr)) setCurrency(curr);
        } else {
            setPriceTag(rate.cardCountry);
            setIsCustomPrice(!PRICE_TAGS.includes(rate.cardCountry));
        }

        setCardType(rate.cardType);
        setRateMultiplier(rate.rate.toString());
        setPublicRateMultiplier(rate.publicRate?.toString() || "");
        setIsPublicSame(rate.publicRate === null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="rates-manager-container">
            <style jsx>{`
                .rates-manager-container {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                    padding: 1rem;
                }
                @media (min-width: 1024px) {
                    .rates-manager-container {
                        grid-template-columns: 400px 1fr;
                        align-items: start;
                    }
                    .rates-table-section {
                        position: sticky;
                        top: 2rem;
                    }
                }
                .form-section {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                .rates-table-section {
                    min-width: 0;
                }
                .active-rates-card {
                    background: var(--surface);
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-sm);
                    display: flex;
                    flex-direction: column;
                    max-height: calc(100vh - 6rem);
                }
                .table-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem;
                    border-bottom: 1px solid var(--border);
                    background: var(--surface);
                    z-index: 5;
                }
                .rates-table thead th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    background: var(--bg-alt);
                }
                .btn-remove-all {
                    background: var(--danger);
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .btn-remove-all:hover {
                    background-color: #e53e3e;
                }
                .table-container {
                    overflow-y: auto;
                    flex: 1;
                }
                .rates-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }
                .rates-table th {
                    background: var(--bg-alt);
                    padding: 0.75rem 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: var(--text-muted);
                    border-bottom: 1px solid var(--border);
                }
                .rates-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    color: var(--foreground);
                }
                .rate-badge {
                    font-weight: 700;
                    font-size: 1rem;
                }
                .action-link {
                    background: none;
                    border: none;
                    color: var(--primary);
                    padding: 0;
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                .action-link:hover {
                    text-decoration: underline;
                }
                .action-link.remove {
                    color: var(--danger);
                }
                .type-tag {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.15rem 0.5rem;
                    border-radius: 4px;
                    background: var(--info-light);
                    color: var(--info);
                    margin-left: 0.5rem;
                }
                .type-tag.ecode {
                    background: rgba(107, 70, 193, 0.1);
                    color: #9f7aea;
                }
            `}</style>

            <div className="form-section">
                {/* Add/Update Rate Form */}
                <div className="card">
                    <h3 style={{ marginBottom: "1.5rem" }}>Add or Update Rate</h3>
                    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Card Brand</label>
                            <SearchableCategorySelect
                                value={isCustomBrand ? "Other" : cardBrand}
                                onChange={(val) => {
                                    if (val === "Other") {
                                        setIsCustomBrand(true);
                                        setCardBrand("");
                                    } else {
                                        setIsCustomBrand(false);
                                        setCardBrand(val);
                                    }
                                }}
                                categories={BRAND_OPTIONS}
                                className="form-select"
                                required={!isCustomBrand}
                                placeholder="Select popular brand..."
                            />
                            {isCustomBrand && (
                                <input
                                    type="text"
                                    value={cardBrand}
                                    onChange={(e) => setCardBrand(e.target.value)}
                                    className="form-input"
                                    style={{ marginTop: '0.5rem' }}
                                    placeholder="Type brand name..."
                                    required={isCustomBrand}
                                    autoFocus
                                />
                            )}
                        </div>

                        <div className="grid-2">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Currency</label>
                                <SearchableCategorySelect
                                    value={currency}
                                    onChange={(val) => setCurrency(val)}
                                    categories={CURRENCY_OPTIONS}
                                    className="form-select"
                                    required
                                    showSearch={false}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Price Tag (Face Value)</label>
                                <SearchableCategorySelect
                                    value={isCustomPrice ? "Other" : priceTag}
                                    onChange={(val) => {
                                        if (val === "Other") { setIsCustomPrice(true); setPriceTag(""); }
                                        else { setIsCustomPrice(false); setPriceTag(val); }
                                    }}
                                    categories={PRICE_TAG_OPTIONS}
                                    className="form-select"
                                    required={!isCustomPrice}
                                    showSearch={true}
                                />
                                {isCustomPrice && (
                                    <input type="text" value={priceTag} onChange={(e) => setPriceTag(e.target.value)} className="form-input" style={{ marginTop: '0.5rem' }} placeholder="e.g. 50" required autoFocus />
                                )}
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Card Type</label>
                                <SearchableCategorySelect
                                    value={cardType}
                                    onChange={(val) => setCardType(val)}
                                    categories={CARD_TYPE_OPTIONS}
                                    className="form-select"
                                    required
                                    showSearch={false}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Trading Payout Rate (multiplier)</label>
                                <input type="number" step="any" value={rateMultiplier} onChange={(e) => setRateMultiplier(e.target.value)} className="form-input" placeholder="e.g. 10.5" required />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label className="form-label">Public Display Rate</label>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isPublicSame} onChange={(e) => setIsPublicSame(e.target.checked)} />
                                    Same as Trading
                                </label>
                            </div>
                            <input type="number" step="any" value={isPublicSame ? rateMultiplier : publicRateMultiplier} onChange={(e) => setPublicRateMultiplier(e.target.value)} className="form-input" placeholder="Public display rate" disabled={isPublicSame} required={!isPublicSame} />
                        </div>

                        <div className="flex" style={{ gap: "0.75rem", marginTop: "0.5rem" }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>Save Rate Config</button>
                            <button type="button" className="btn btn-secondary" onClick={() => { setCardBrand(""); setRateMultiplier(""); setEditingId(null); }} disabled={loading}>Clear</button>
                        </div>
                    </form>
                </div>

                {/* Bulk Configure Rates card */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "1.5rem" }}>
                        <h3 style={{ margin: 0 }}>Bulk Configure Rates</h3>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button type="button" onClick={() => setBulkBrands(POPULAR_BRANDS)} className="action-link" style={{ fontSize: '0.8rem' }}>Select All</button>
                            <span style={{ opacity: 0.3 }}>|</span>
                            <button type="button" onClick={() => setBulkBrands([])} className="action-link" style={{ fontSize: '0.8rem' }}>Clear All</button>
                        </div>
                    </div>
                    <form onSubmit={handleBulkSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="grid-2">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Currency</label>
                                <SearchableCategorySelect
                                    value={bulkCurrency}
                                    onChange={(val) => setBulkCurrency(val)}
                                    categories={CURRENCY_OPTIONS}
                                    className="form-select"
                                    required
                                    showSearch={false}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Price Tag</label>
                                <SearchableCategorySelect
                                    value={bulkPriceTag}
                                    onChange={(val) => setBulkPriceTag(val)}
                                    categories={PRICE_TAG_OPTIONS.filter(o => o.value !== "Other")}
                                    className="form-select"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Card Type</label>
                                <SearchableCategorySelect
                                    value={bulkCardType}
                                    onChange={(val) => setBulkCardType(val)}
                                    categories={CARD_TYPE_OPTIONS}
                                    className="form-select"
                                    required
                                    showSearch={false}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Trading Payout Rate (multiplier)</label>
                                <input type="number" step="any" value={bulkRateMultiplier} onChange={(e) => setBulkRateMultiplier(e.target.value)} className="form-input" placeholder="e.g. 10.5" required />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <label className="form-label">Public Display Rate (Bulk)</label>
                                <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isBulkPublicSame} onChange={(e) => setIsBulkPublicSame(e.target.checked)} />
                                    Same as Trading
                                </label>
                            </div>
                            <input type="number" step="any" value={isBulkPublicSame ? bulkRateMultiplier : bulkPublicRateMultiplier} onChange={(e) => setBulkPublicRateMultiplier(e.target.value)} className="form-input" placeholder="Public display rate" disabled={isBulkPublicSame} required={!isBulkPublicSame} />
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem", maxHeight: "150px", overflowY: "auto", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: 'var(--bg-alt)' }}>
                                {POPULAR_BRANDS.map(brand => (
                                    <label key={brand} style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", padding: '0.25rem' }}>
                                        <input type="checkbox" checked={bulkBrands.includes(brand)} onChange={(e) => {
                                            if (e.target.checked) setBulkBrands([...bulkBrands, brand]);
                                            else setBulkBrands(bulkBrands.filter(b => b !== brand));
                                        }} />
                                        {brand}
                                    </label>
                                ))}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.6 }}>
                                {bulkBrands.length} brands selected
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading || bulkBrands.length === 0}>Apply Bulk Config</button>
                    </form>
                </div>
            </div>

            <div className="rates-table-section">
                <div className="active-rates-card">
                    <div className="table-header-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Active Rates ({filteredRates.length})</h3>
                            <button onClick={handleDeleteAll} disabled={loading} className="btn-remove-all">Remove All Rates</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Brand or Category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                            style={{ 
                                padding: '0.6rem 1rem', 
                                border: '1px solid var(--border)', 
                                borderRadius: '6px',
                                fontSize: '0.9rem',
                                backgroundColor: 'var(--bg-alt)' 
                            }}
                        />
                    </div>

                    <div className="table-container">
                        <table className="rates-table">
                            <thead>
                                <tr>
                                    <th>Brand</th>
                                    <th>Currency / Category</th>
                                    <th>Trading Rate</th>
                                    <th>Public Rate</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRates.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>{searchQuery ? "No matching rates found." : "No custom rates configured."}</td></tr>
                                ) : filteredRates.map(rate => (
                                    <tr key={rate.id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {rate.cardBrand}
                                            <span className={`type-tag ${rate.cardType === 'E-code' ? 'ecode' : ''}`}>
                                                {rate.cardType === 'E-code' ? 'E' : 'P'}
                                            </span>
                                        </td>
                                        <td>
                                            {rate.cardCountry}
                                        </td>
                                        <td>
                                            <span className="rate-badge" style={{ color: 'var(--info)' }}>{rate.rate}x</span>
                                        </td>
                                        <td>
                                            <span className="rate-badge" style={{ color: (rate.publicRate !== null && rate.publicRate !== rate.rate) ? 'var(--warning)' : 'inherit' }}>
                                                {rate.publicRate !== null ? rate.publicRate : rate.rate}x
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <button onClick={() => handleEdit(rate)} className="action-link">Edit</button>
                                                <span style={{ opacity: 0.3 }}>|</span>
                                                <button onClick={() => handleDelete(rate.id)} className="action-link remove">Remove</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
