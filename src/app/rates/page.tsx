"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RatesCalculator from "@/components/RatesCalculator";
import { FaSearch, FaFilter, FaSyncAlt, FaArrowRight, FaInfoCircle } from "react-icons/fa";
import Link from "next/link";
import { formatCategoryWithFlag, searchAndSortRates } from "@/lib/categoryUtils";

type Rate = {
    id: number;
    cardBrand: string;
    cardCountry: string;
    cardType?: string;
    rate: number;
    publicRate: number | null;
};

export default function PublicRatesPage() {
    const [rates, setRates] = useState<Rate[]>([]);
    const [loading, setLoading] = useState(true);
    const [usdtExchangeRate, setUsdtExchangeRate] = useState<number>(15.0);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("All Brands");
    const [selectedType, setSelectedType] = useState("All Types");

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

    const brands = ["All Brands", ...Array.from(new Set(rates.map(r => r.cardBrand))).sort()];

    const filteredRates = useMemo(() => {
        let list = rates;
        if (selectedBrand !== "All Brands") {
            list = list.filter(r => r.cardBrand === selectedBrand);
        }
        const typeFilter = selectedType === "All Types" ? "All" : (selectedType === "E-code" ? "E-code" : "Physical");
        return searchAndSortRates(list, searchTerm, typeFilter, "Default");
    }, [rates, searchTerm, selectedBrand, selectedType]);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />

            <main className="flex-1" style={{ padding: '4rem 0', background: 'var(--background)' }}>
                <div className="container">

                    {/* Hero Section */}
                    <div className="animate-in" style={{ marginBottom: '4rem', textAlign: 'center' }}>
                        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1rem', background: 'linear-gradient(135deg, var(--foreground) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Gift Card Rates
                        </h1>
                        <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto', opacity: 0.7 }}>
                            Check our current payout rates for all popular gift cards.
                            We offer the most competitive rates in Ghana with instant payouts.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '3rem', alignItems: 'start' }} className="flex-mobile-col">

                        {/* Sidebar: Calculator */}
                        <div style={{ flex: '1' }} className="w-full">
                            <RatesCalculator />

                            <div className="card glass" style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--primary-light)', border: 'none' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <FaInfoCircle color="var(--primary)" size={18} style={{ marginTop: '3px' }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Trading Tip</h4>
                                        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>
                                            Rates for High Denomination cards ($100+) are usually higher.
                                            Contact support for bulk trading bonuses!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content: Rates Table */}
                        <div className="animate-in w-full" style={{ animationDelay: '0.1s', flex: '2' }}>

                            {/* Controls */}
                            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '250px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Search brand or category..."
                                            style={{ paddingLeft: '3rem' }}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, width: '200px' }}>
                                    <select
                                        className="form-select"
                                        value={selectedBrand}
                                        onChange={(e) => setSelectedBrand(e.target.value)}
                                    >
                                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0, width: '150px' }}>
                                    <select
                                        className="form-select"
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                    >
                                        <option value="All Types">All Types</option>
                                        <option value="Physical">Physical</option>
                                        <option value="E-code">E-code</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {loading ? (
                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                        <FaSyncAlt className="animate-spin" style={{ fontSize: '2rem', opacity: 0.2, animation: 'spin 2s linear infinite' }} />
                                        <p style={{ marginTop: '1rem', opacity: 0.5 }}>Loading current market rates...</p>
                                    </div>
                                ) : filteredRates.length === 0 ? (
                                    <div style={{ padding: '4rem', textAlign: 'center' }}>
                                        <p style={{ opacity: 0.5 }}>No rates found matching your criteria.</p>
                                    </div>
                                ) : (
                                    <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
                                        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '600px' }}>
                                            <thead style={{ background: 'var(--surface-hover)' }}>
                                                <tr>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Card Brand</th>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Category</th>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Type</th>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Rate (GHS & USDT)</th>
                                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRates.map((rate, idx) => (
                                                    <tr key={rate.id} style={{ borderBottom: idx === filteredRates.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{rate.cardBrand}</td>
                                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                {formatCategoryWithFlag(rate.cardCountry)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                                            <span style={{
                                                                background: (rate.cardType === 'E-code') ? '#e0f2fe' : '#dcfce7',
                                                                color: (rate.cardType === 'E-code') ? '#0369a1' : '#166534',
                                                                padding: '0.25rem 0.5rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 600,
                                                                border: `1px solid ${(rate.cardType === 'E-code') ? '#bae6fd' : '#bbf7d0'}`
                                                            }}>
                                                                {rate.cardType || 'Physical'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                            <div>{rate.publicRate ?? rate.rate} GHS</div>
                                                            <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: '0.2rem' }}>
                                                                ≈ {((rate.publicRate ?? rate.rate) / usdtExchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                            <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                                Sell Now <FaArrowRight size={10} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />

            <style jsx>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}
