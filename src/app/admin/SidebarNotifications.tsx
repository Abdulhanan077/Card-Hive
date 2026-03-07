"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPendingAdminTradesAction } from "@/app/actions/admin";

interface PendingTrade {
    id: number;
    tradeId: string;
    faceValue: number;
    currency: string;
    cardBrand: string;
    createdAt: Date;
    user: { username: string };
}

export default function SidebarNotifications() {
    const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const trades = await getPendingAdminTradesAction();
                setPendingTrades(trades as unknown as PendingTrade[]);
            } catch (error) {
                console.error("Failed to fetch pending trades", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPending();

        // Refresh every 5 minutes in dev, 30s in prod
        const interval = setInterval(fetchPending, process.env.NODE_ENV === 'development' ? 300000 : 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div style={{ padding: '1rem', opacity: 0.5, fontSize: '0.875rem' }}>Loading notifications...</div>;
    }

    if (pendingTrades.length === 0) {
        return (
            <div style={{ padding: '1rem', opacity: 0.6, fontSize: '0.875rem', textAlign: 'center', backgroundColor: 'var(--bg-alt)', borderRadius: 'var(--radius-md)' }}>
                No pending actions. You're all caught up!
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingTrades.map((trade) => {
                const ageHours = Math.floor((new Date().getTime() - new Date(trade.createdAt).getTime()) / (1000 * 60 * 60));

                return (
                    <Link href={`/admin/trades/${trade.tradeId}`} key={trade.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-alt)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: `3px solid ${ageHours > 24 ? 'var(--danger)' : 'var(--warning)'}`,
                            transition: 'background-color 0.2s',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-alt)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>@{trade.user.username}</span>
                                <span style={{ fontSize: '0.75rem', color: ageHours > 24 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                    {ageHours < 1 ? 'Just now' : `${ageHours}h ago`}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {trade.cardBrand} - {trade.faceValue} {trade.currency}
                            </div>
                        </div>
                    </Link>
                );
            })}
            <Link href="/admin/trades" style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--primary)', marginTop: '0.5rem', textDecoration: 'underline' }}>
                View All Pending Queue
            </Link>
        </div>
    );
}
