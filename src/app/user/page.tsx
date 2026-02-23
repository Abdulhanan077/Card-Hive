import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { calculateVipTier, getNextVipTier } from "@/lib/vipTiers";

export default async function UserDashboardHome() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const userId = parseInt(session.user.id);

    // Fetch summary stats
    const totalTrades = await prisma.trade.count({ where: { userId } });
    const pendingTrades = await prisma.trade.count({ where: { userId, status: "PENDING" } });
    const paidTrades = await prisma.trade.count({ where: { userId, status: "PAID" } });

    // Aggregate total paid value
    const paidStats = await prisma.trade.aggregate({
        where: { userId, status: "PAID" },
        _sum: { faceValue: true }
    });
    const totalPaidValue = paidStats._sum.faceValue || 0;

    // Fetch User Referral Details
    const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true, rewardBalance: true, completedTradesCount: true }
    });

    const currentTier = calculateVipTier(userData?.completedTradesCount || 0);
    const nextTier = getNextVipTier(currentTier.level);
    const tradesNeeded = nextTier ? nextTier.minTrades - (userData?.completedTradesCount || 0) : 0;
    const progressPercent = nextTier
        ? (((userData?.completedTradesCount || 0) - currentTier.minTrades) / (nextTier.minTrades - currentTier.minTrades)) * 100
        : 100;

    // Fetch recent trades
    const recentTrades = await prisma.trade.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5
    });

    return (
        <>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Welcome back, {session.user.username}!</h1>
                <p className="dashboard-subtitle">Here's an overview of your trading activity.</p>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-label">Total Trades</div>
                    <div className="summary-value">{totalTrades}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Pending Review</div>
                    <div className="summary-value">{pendingTrades}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Completed Trades</div>
                    <div className="summary-value" style={{ color: "var(--success)" }}>{paidTrades}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Value Paid</div>
                    <div className="summary-value">${totalPaidValue.toFixed(2)}</div>
                </div>
            </div>

            {/* VIP Status Section */}
            <div className="card" style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', borderColor: currentTier.color, borderWidth: '2px' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>👑 VIP Tier:</span>
                        <span className="badge" style={{ backgroundColor: currentTier.color, color: '#000', fontSize: '1rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}>
                            {currentTier.name} (Level {currentTier.level})
                        </span>
                    </h3>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        You currently earn <strong style={{ color: currentTier.color }}>{currentTier.multiplier}x</strong> Reward Points on every successful trade!
                    </p>

                    {nextTier ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                                <span>{userData?.completedTradesCount || 0} Trades</span>
                                <span>{tradesNeeded} more to reach {nextTier.name} Level</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%`, height: '100%', backgroundColor: currentTier.color, transition: 'width 0.5s ease' }}></div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', padding: '0.5rem', backgroundColor: 'var(--success-light)', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                            You have reached the maximum VIP Tier!
                        </div>
                    )}
                </div>
            </div>

            {/* Referrals & Rewards Section */}
            <div className="card" style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', justifyContent: 'space-between', borderColor: 'var(--primary)' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>🎁 Referrals & Rewards</h3>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Invite friends using your unique referral link to earn bonus points. You also earn 1 point for every successful trade you complete!
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Your Unique Referral Link</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                readOnly
                                className="form-input"
                                value={`http://localhost:3000/register?ref=${userData?.referralCode}`}
                                style={{ margin: 0, flex: 1, backgroundColor: 'var(--bg-alt)', cursor: 'text' }}
                            />
                            {/* Assuming they can just select and copy for now, later we can add a clipboard component */}
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-alt)', padding: '1.5rem', borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        Reward Balance
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)', margin: '0.5rem 0' }}>
                        {userData?.rewardBalance || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>pts</span>
                    </div>
                    <Link href="/user/rewards" className="btn btn-primary" style={{ width: '100%', fontSize: '0.9rem', padding: '0.5rem' }}>
                        Redeem Points
                    </Link>
                </div>
            </div>

            <div className="dashboard-header" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Recent Trades</h2>
                <Link href="/user/trades" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>View All</Link>
            </div>

            <div className="table-container">
                {recentTrades.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                        No trades submitted yet. <Link href="/user/sell" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Submit your first gift card!</Link>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Trade ID</th>
                                <th>Date</th>
                                <th>Card details</th>
                                <th>Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentTrades.map((trade) => (
                                <tr key={trade.id}>
                                    <td style={{ fontWeight: 500 }}>{trade.tradeId}</td>
                                    <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {trade.cardBrand} <span style={{ opacity: 0.6, fontSize: '0.85em' }}>({trade.cardType})</span>
                                    </td>
                                    <td>{trade.faceValue} {trade.currency}</td>
                                    <td>
                                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                                            {trade.status.replace("_", " ")}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
