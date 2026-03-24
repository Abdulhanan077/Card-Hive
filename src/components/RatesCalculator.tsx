"use client";

import { useState, useEffect } from "react";
import { FaCalculator, FaArrowRight, FaSyncAlt } from "react-icons/fa";
import Link from "next/link";
import { sortCategories, validateCategoryAmount } from "@/lib/categoryUtils";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

type Rate = {
    id: number;
    cardBrand: string;
    cardCountry: string;
    cardType: string;
    rate: number;
    publicRate: number | null;
};

export default function RatesCalculator() {
    const [rates, setRates] = useState<Rate[]>([]);
    const [loading, setLoading] = useState(true);
    const [usdtExchangeRate, setUsdtExchangeRate] = useState<number>(15.0);
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedType, setSelectedType] = useState("Physical");
    const [amount, setAmount] = useState<string>("");
    const [result, setResult] = useState<number | null>(null);
    const [amountError, setAmountError] = useState<string>("");

    useEffect(() => {
        fetch("/api/rates")
            .then(res => res.json())
            .then(data => {
                setRates(data.rates || []);
                setUsdtExchangeRate(data.usdtExchangeRate || 15.0);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch rates:", err);
                setLoading(false);
            });
    }, []);

    const brands = Array.from(new Set(rates.map(r => r.cardBrand))).sort();
    const categories = Array.from(new Set(
        rates
            .filter(r => r.cardBrand === selectedBrand && (r.cardType === selectedType || (!r.cardType && selectedType === "Physical")))
            .map(r => r.cardCountry)
    )).sort(sortCategories);

    // Auto-select category when lists change to prevent invalid state
    useEffect(() => {
        if (categories.length > 0 && !categories.includes(selectedCategory)) {
            setSelectedCategory(""); // Reset to force user to choose valid option for new type
        }
    }, [selectedBrand, selectedType, categories, selectedCategory]);

    useEffect(() => {
        if (selectedBrand && selectedCategory && amount && !isNaN(parseFloat(amount))) {
            const value = parseFloat(amount);
            let hasError = false;
            let errorMessage = "";

            // Range checks
            const validationError = validateCategoryAmount(value, selectedCategory);
            if (validationError) {
                hasError = true;
                errorMessage = validationError;
            }

            if (hasError) {
                setAmountError(errorMessage);
                setResult(null);
            } else {
                setAmountError("");
                const rateRecord = rates.find(r => r.cardBrand === selectedBrand && r.cardCountry === selectedCategory && (r.cardType === selectedType || (!r.cardType && selectedType === "Physical")));
                if (rateRecord) {
                    const multiplier = rateRecord.publicRate ?? rateRecord.rate;
                    setResult(value * multiplier);
                } else {
                    setResult(null);
                }
            }
        } else {
            setAmountError("");
            setResult(null);
        }
    }, [selectedBrand, selectedCategory, amount, rates, selectedType]);

    return (
        <div className="calculator-container animate-in">
            <style jsx>{`
                .calculator-container {
                    background: var(--surface);
                    border-radius: var(--radius-xl);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border);
                    position: relative;
                }

                .calculator-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 150px;
                    height: 150px;
                    background: radial-gradient(circle, var(--primary-light) 0%, transparent 70%);
                    opacity: 0.5;
                    pointer-events: none;
                }

                .calc-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 2rem;
                }

                .calc-icon {
                    background: var(--primary);
                    color: white;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .calc-title {
                    margin: 0;
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: var(--foreground);
                }

                .calc-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1.5rem;
                }

                .form-group {
                    position: relative;
                }

                /* Ensure dropdowns stack correctly on top of subsequent fields */
                .form-group:nth-child(1) { z-index: 50; }
                .form-group:nth-child(2) { z-index: 40; }
                .form-group:nth-child(3) { z-index: 30; }
                .form-group:nth-child(4) { z-index: 20; }

                .field-label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: var(--foreground);
                    opacity: 0.8;
                }

                .select-wrapper {
                    position: relative;
                }

                :global(.calc-select), .calc-input {
                    width: 100%;
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    border: 2px solid var(--border);
                    background: var(--background);
                    color: var(--foreground);
                    font-size: 1rem;
                    font-weight: 500;
                    transition: var(--transition);
                }

                :global(.calc-select):focus, .calc-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px var(--primary-light);
                }

                :global(.calc-select).disabled, :global(.calc-select):disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .result-area {
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px dashed var(--border);
                    text-align: center;
                }

                .result-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--foreground);
                    opacity: 0.6;
                    margin-bottom: 0.5rem;
                }

                .result-value {
                    font-size: 2.5rem;
                    font-weight: 900;
                    color: var(--primary);
                    margin: 0.5rem 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .result-currency {
                    font-size: 1.25rem;
                    font-weight: 600;
                    vertical-align: middle;
                    margin-top: 0.5rem;
                }

                .calc-cta {
                    margin-top: 1.5rem;
                    width: 100%;
                }

                .view-all-link {
                    display: block;
                    text-align: center;
                    margin-top: 1.5rem;
                    color: var(--primary);
                    font-size: 0.875rem;
                    font-weight: 600;
                    text-decoration: none;
                    transition: var(--transition);
                }

                .view-all-link:hover {
                    text-decoration: underline;
                    transform: translateX(5px);
                }

                @media (max-width: 640px) {
                    .calculator-container {
                        padding: 1.5rem;
                    }
                    .result-value {
                        font-size: 2rem;
                    }
                }

                .animate-in {
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div className="calc-header">
                <div className="calc-icon">
                    <FaCalculator size={20} />
                </div>
                <h3 className="calc-title">Rate Calculator</h3>
            </div>

            <div className="calc-grid">
                <div className="form-group">
                    <label className="field-label">Select Gift Card Brand</label>
                    <SearchableCategorySelect
                        className="calc-select"
                        value={selectedBrand}
                        onChange={(val) => {
                            setSelectedBrand(val);
                            setSelectedCategory("");
                        }}
                        categories={brands}
                        placeholder="Choose Brand..."
                        searchPlaceholder="Search brands..."
                    />
                </div>

                <div className="form-group">
                    <label className="field-label">Card Type</label>
                    <SearchableCategorySelect
                        className="calc-select"
                        value={selectedType}
                        onChange={(val) => {
                            setSelectedType(val);
                            setSelectedCategory("");
                        }}
                        categories={["Physical", "E-code"]}
                        placeholder="Select Card Type..."
                        showSearch={false}
                    />
                </div>

                <div className="form-group">
                    <label className="field-label">Category / Country</label>
                    <SearchableCategorySelect
                        className="calc-select"
                        value={selectedCategory}
                        onChange={(val) => setSelectedCategory(val)}
                        disabled={!selectedBrand}
                        categories={categories}
                        placeholder={selectedBrand ? `Choose Category for ${selectedType}...` : "Select Brand First"}
                        searchPlaceholder="Type amount to filter..."
                    />
                </div>

                <div className="form-group">
                    <label className="field-label">Amount (USD/GBP/EUR)</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            className="calc-input"
                            placeholder="Enter face value amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        {amountError && <div style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{amountError}</div>}
                    </div>
                </div>
            </div>

            <div className="result-area">
                <div className="result-label">ESTIMATED PAYOUT</div>
                <div className="result-value">
                    {result !== null ? (
                        <>
                            <span className="result-currency">GHS</span>
                            {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </>
                    ) : (
                        <span style={{ opacity: 0.3 }}>0.00</span>
                    )}
                </div>
                {result !== null && usdtExchangeRate > 0 && (
                    <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '0.25rem' }}>
                        ≈ {(result / usdtExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </div>
                )}
                <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>
                    * Rates are dynamic and subject to change.
                </p>

                <Link href="/login" className="btn btn-primary calc-cta">
                    Sell Now <FaArrowRight style={{ marginLeft: '0.5rem' }} />
                </Link>

                <Link href="/rates" className="view-all-link">
                    View Full Rates Table <FaArrowRight size={10} style={{ marginLeft: '0.3rem' }} />
                </Link>
            </div>
        </div>
    );
}
