"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RatesCalculator from "@/components/RatesCalculator";
import { FaSearch, FaFilter, FaSyncAlt, FaArrowRight, FaInfoCircle } from "react-icons/fa";
import Link from "next/link";

type Rate = {
    id: number;
    cardBrand: string;
    cardCountry: string;
    rate: number;
    publicRate: number | null;
};

export default function PublicRatesPage() {
    const [rates, setRates] = useState<Rate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("All Brands");

    useEffect(() => {
        fetch("/api/rates")
            .then(res => res.json())
            .then(data => {
                setRates(data.rates || []);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch rates:", err);
                setLoading(false);
            });
    }, []);

    const brands = ["All Brands", ...Array.from(new Set(rates.map(r => r.cardBrand))).sort()];

    const filteredRates = rates.filter(rate => {
        const matchesSearch =
            rate.cardBrand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rate.cardCountry.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBrand = selectedBrand === "All Brands" || rate.cardBrand === selectedBrand;
        return matchesSearch && matchesBrand;
    });

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
                        <div style={{ flex: '1' }} className="w-full sticky-desktop">
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
                                    <div className="table-container">
                                        <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: 'var(--surface-hover)' }}>
                                                <tr>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Card Brand</th>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Category</th>
                                                    <th style={{ padding: '1.25rem 1.5rem' }}>Rate (GHS/$)</th>
                                                    <th style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredRates.map((rate, idx) => (
                                                    <tr key={rate.id} style={{ borderBottom: idx === filteredRates.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600 }}>{rate.cardBrand}</td>
                                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                {rate.cardCountry}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1.25rem 1.5rem', fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                                                            {rate.publicRate ?? rate.rate}
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
