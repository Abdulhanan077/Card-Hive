import { prisma } from "@/lib/prisma";
import ClientMetricsCharts from "./ClientMetricsCharts";
import Link from "next/link";

export default async function AdminDashboardHome() {
    const totalTrades = await prisma.trade.count();
    const pendingTrades = await prisma.trade.count({ where: { status: "PENDING" } });
    const underReviewTrades = await prisma.trade.count({ where: { status: "UNDER_REVIEW" } });
    const paidTrades = await prisma.trade.count({ where: { status: { in: ["PAID", "COMPLETED"] } } });
    const rejectedTrades = await prisma.trade.count({ where: { status: "REJECTED" } });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dailyTrades = await prisma.trade.count({
        where: { createdAt: { gte: startOfToday } }
    });

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stalePendingTrades = await prisma.trade.count({
        where: { status: "PENDING", createdAt: { lt: twentyFourHoursAgo } }
    });

    const totalUsers = await prisma.user.count({ where: { role: "USER" } });
    const customerMessagesCount = await prisma.message.count({
        where: { sender: { role: "USER" } }
    });

    const paidStats = await prisma.trade.aggregate({
        where: { status: { in: ["PAID", "COMPLETED"] } },
        _sum: { faceValue: true, calculatedPayout: true },
        _avg: { faceValue: true, calculatedPayout: true }
    });
    const totalPaidFaceValue = paidStats._sum.faceValue || 0;
    const totalCedisPaid = paidStats._sum.calculatedPayout || 0;
    const avgFaceValue = paidStats._avg.faceValue || 0;
    const avgPayout = paidStats._avg.calculatedPayout || 0;

    // Prepare data for Recharts
    const statusChartData = [
        { name: 'Pending', value: pendingTrades, color: 'var(--warning)' },
        { name: 'Reviewing', value: underReviewTrades, color: 'var(--info)' },
        { name: 'Successful', value: paidTrades, color: 'var(--success)' },
        { name: 'Rejected', value: rejectedTrades, color: 'var(--danger)' },
    ];

    const volumeChartData = [
        { name: 'Total volume', value: totalTrades }
    ];

    return (
        <>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Admin Dashboard</h1>
                <p className="dashboard-subtitle">Platform overview and actionable metrics.</p>
            </div>

            <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="summary-card">
                    <div className="summary-label">Total Trades Lifetime</div>
                    <div className="summary-value">{totalTrades}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                    <div className="summary-label">Today's Trades</div>
                    <div className="summary-value" style={{ color: 'var(--primary)' }}>{dailyTrades}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--warning)' }}>
                    <div className="summary-label">Pending Intake</div>
                    <div className="summary-value" style={{ color: 'var(--warning)' }}>{pendingTrades}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--info)' }}>
                    <div className="summary-label">Currently Reviewing</div>
                    <div className="summary-value" style={{ color: 'var(--info)' }}>{underReviewTrades}</div>
                </div>

                <div className="summary-card" style={{ borderColor: 'var(--success)' }}>
                    <div className="summary-label">Successful Trades</div>
                    <div className="summary-value" style={{ color: 'var(--success)' }}>{paidTrades}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--danger)' }}>
                    <div className="summary-label">Rejected Trades</div>
                    <div className="summary-value" style={{ color: 'var(--danger)' }}>{rejectedTrades}</div>
                </div>

                <div className="summary-card" style={{ borderColor: 'var(--success)', minWidth: '250px' }}>
                    <div className="summary-label">Total GHS Payout</div>
                    <div className="summary-value" style={{ color: 'var(--success)' }}>GH₵ {totalCedisPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                    <div className="summary-label">Total Face Value Received</div>
                    <div className="summary-value" style={{ color: 'var(--primary)' }}>${totalPaidFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>

                <div className="summary-card" style={{ borderColor: 'var(--danger)' }}>
                    <div className="summary-label">Pending &gt; 24h (Alert)</div>
                    <div className="summary-value" style={{ color: 'var(--danger)' }}>{stalePendingTrades}</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Average Payout</div>
                    <div className="summary-value" style={{ color: 'var(--success)' }}>GH₵ {avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                    <div className="summary-label">Average Trade Value</div>
                    <div className="summary-value" style={{ color: 'var(--primary)' }}>${avgFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <Link href="/admin/users" style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="summary-card" style={{ borderColor: 'var(--info)', cursor: 'pointer', height: '100%' }}>
                        <div className="summary-label">Registered Users (Portal)</div>
                        <div className="summary-value" style={{ color: 'var(--info)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <span>{totalUsers}</span>
                            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Manage &rarr;</span>
                        </div>
                    </div>
                </Link>
                <div className="summary-card" style={{ borderColor: 'var(--warning)' }}>
                    <div className="summary-label">Customer Messages</div>
                    <div className="summary-value" style={{ color: 'var(--warning)' }}>{customerMessagesCount}</div>
                </div>
            </div>

            <div className="dashboard-header flex-mobile-col" style={{ marginTop: '4rem' }}>
                <h2>Platform Analytics Overview</h2>
            </div>

            <ClientMetricsCharts statusData={statusChartData} volumeData={volumeChartData} />
        </>
    );
}
