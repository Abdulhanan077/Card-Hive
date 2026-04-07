"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FaExternalLinkAlt, FaSearchDollar } from "react-icons/fa";

type BalanceCheckerLink = {
    id: number;
    brandName: string;
    url: string;
};

export default function CheckBalancePage() {
    const [links, setLinks] = useState<BalanceCheckerLink[]>([]);
    const [selectedBrand, setSelectedBrand] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const res = await fetch("/api/admin/balance-checkers");
                const result = await res.json();
                if (result.success) {
                    setLinks(result.data.filter((l: any) => l.isActive));
                }
            } catch (error) {
                console.error("Failed to load balance checkers", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLinks();
    }, []);

    const handleCheckBalance = () => {
        if (selectedBrand) {
            window.open(selectedBrand, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <>
            <Header />
            <main style={{ minHeight: 'calc(100vh - 200px)', padding: '4rem 1rem', background: 'var(--background)' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--foreground)' }}>
                        Check Your Card Balance
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                        Select a gift card brand below to be redirected to their official balance verification portal. 
                        We recommend checking your balance before trading to ensure a smooth process.
                    </p>
                </div>

                <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                        <FaSearchDollar size={24} />
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>Verify Balance</h2>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Loading official brands...
                        </div>
                    ) : links.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No official checkers available at the moment.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Select Brand</label>
                                <select 
                                    className="form-select" 
                                    value={selectedBrand} 
                                    onChange={(e) => setSelectedBrand(e.target.value)}
                                    style={{ padding: '1rem', fontSize: '1.1rem', backgroundColor: 'var(--bg-alt)' }}
                                >
                                    <option value="" disabled>Select a gift card brand...</option>
                                    {links.map(brand => (
                                        <option key={brand.id} value={brand.url}>{brand.brandName}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleCheckBalance} 
                                disabled={!selectedBrand}
                                className={`btn ${selectedBrand ? 'btn-primary' : ''}`}
                                style={{ 
                                    width: '100%', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    fontSize: '1.1rem',
                                    opacity: selectedBrand ? 1 : 0.6,
                                    cursor: selectedBrand ? 'pointer' : 'not-allowed',
                                    border: selectedBrand ? undefined : '1px solid var(--border)',
                                    backgroundColor: selectedBrand ? undefined : 'var(--bg-alt)',
                                    color: selectedBrand ? undefined : 'var(--text-muted)',
                                    marginTop: '0.5rem'
                                }}
                            >
                                Go to Official Website <FaExternalLinkAlt size={16} />
                            </button>
                            
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0, marginTop: '0.5rem' }}>
                                Note: Card Hive is not affiliated with these brands. Always ensure you are on the official website before entering card credentials.
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
