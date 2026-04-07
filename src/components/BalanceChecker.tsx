"use client";

import { useState } from "react";
import { FaExternalLinkAlt, FaSearchDollar } from "react-icons/fa";

const BRAND_LINKS = [
    { name: "Amazon", url: "https://www.amazon.com/gc/balance" },
    { name: "Apple / iTunes", url: "https://secure1.store.apple.com/shop/giftcard/balance" },
    { name: "Google Play", url: "https://play.google.com/store/paymentmethods" },
    { name: "Steam", url: "https://store.steampowered.com/account/redeemwalletcode" },
    { name: "Sephora", url: "https://www.sephora.com/beauty/giftcards" },
    { name: "Vanilla Visa", url: "https://balance.vanillagift.com/" },
    { name: "American Express (Amex)", url: "https://balance.amexgiftcard.com/" },
    { name: "Nike", url: "https://www.nike.com/orders/gift-card-lookup" },
    { name: "Nordstrom", url: "https://www.nordstrom.com/gift-cards/balance" },
    { name: "Macy's", url: "https://www.macys.com/account/wallet" },
    { name: "Target", url: "https://www.target.com/guest/gift-card-balance" },
    { name: "Walmart", url: "https://www.walmart.com/account/giftcards/manage" }
];

export default function BalanceChecker() {
    const [selectedBrand, setSelectedBrand] = useState("");

    const handleCheckBalance = () => {
        if (selectedBrand) {
            window.open(selectedBrand, "_blank", "noopener,noreferrer");
        }
    };

    return (
        <div className="card balance-checker-card" style={{ padding: '1.5rem', width: '100%', maxWidth: '400px', margin: '0 auto', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--foreground)' }}>
                <FaSearchDollar size={20} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Check Card Balance</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: 1.4 }}>
                Verify your gift card balance on the official brand website before trading.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <select 
                    className="form-select" 
                    value={selectedBrand} 
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                >
                    <option value="" disabled>Select a gift card brand...</option>
                    {BRAND_LINKS.sort((a, b) => a.name.localeCompare(b.name)).map(brand => (
                        <option key={brand.name} value={brand.url}>{brand.name}</option>
                    ))}
                </select>

                <button 
                    onClick={handleCheckBalance} 
                    disabled={!selectedBrand}
                    className={`btn ${selectedBrand ? 'btn-primary' : ''}`}
                    style={{ 
                        width: '100%', 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.8rem',
                        opacity: selectedBrand ? 1 : 0.6,
                        cursor: selectedBrand ? 'pointer' : 'not-allowed',
                        border: selectedBrand ? undefined : '1px solid var(--border)',
                        backgroundColor: selectedBrand ? undefined : 'var(--bg-alt)',
                        color: selectedBrand ? undefined : 'var(--text-muted)'
                    }}
                >
                    Go to Official Website <FaExternalLinkAlt size={14} />
                </button>
            </div>
        </div>
    );
}
