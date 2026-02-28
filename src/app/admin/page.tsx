import { prisma } from "@/lib/prisma";
import ClientMetricsCharts from "./ClientMetricsCharts";
import Link from "next/link";

export default async function AdminDashboardHome() {
    try {
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

        // Fetch recent failed login attempts
        const recentFailedLogins = await prisma.loginEvent.findMany({
            where: { success: false },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
                id: true,
                emailOrUsername: true,
                portal: true,
                createdAt: true,
                ipAddress: true
            }
        });

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

        // Helper to determine font size based on value length (more aggressive to prevent truncation)
        const getFontSize = (value: string | number) => {
            const str = String(value);
            if (str.length > 15) return '1.1rem';
            if (str.length > 12) return '1.3rem';
            if (str.length > 10) return '1.5rem';
            if (str.length > 8) return '1.8rem';
            return '2.25rem';
        };

        return (
            <>
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Admin Dashboard</h1>
                    <p className="dashboard-subtitle">Platform overview and actionable metrics.</p>
                </div>

                <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                    <div className="summary-card">
                        <div className="summary-label">Total Trades Lifetime</div>
                        <div className="summary-value" style={{ fontSize: getFontSize(totalTrades) }}>{totalTrades}</div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                        <div className="summary-label">Today's Trades</div>
                        <div className="summary-value" style={{ color: 'var(--primary)', fontSize: getFontSize(dailyTrades) }}>{dailyTrades}</div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--warning)' }}>
                        <div className="summary-label">Pending Intake</div>
                        <div className="summary-value" style={{ color: 'var(--warning)', fontSize: getFontSize(pendingTrades) }}>{pendingTrades}</div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--info)' }}>
                        <div className="summary-label">Currently Reviewing</div>
                        <div className="summary-value" style={{ color: 'var(--info)', fontSize: getFontSize(underReviewTrades) }}>{underReviewTrades}</div>
                    </div>

                    <div className="summary-card" style={{ borderColor: 'var(--success)' }}>
                        <div className="summary-label">Successful Trades</div>
                        <div className="summary-value" style={{ color: 'var(--success)', fontSize: getFontSize(paidTrades) }}>{paidTrades}</div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--danger)' }}>
                        <div className="summary-label">Rejected Trades</div>
                        <div className="summary-value" style={{ color: 'var(--danger)', fontSize: getFontSize(rejectedTrades) }}>{rejectedTrades}</div>
                    </div>

                    <div className="summary-card" style={{ borderColor: 'var(--success)', minWidth: '250px' }}>
                        <div className="summary-label">Total GHS Payout</div>
                        <div className="summary-value" style={{
                            color: 'var(--success)',
                            fontSize: getFontSize(`GH₵ ${totalCedisPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            GH₵ {totalCedisPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                        <div className="summary-label">Total Face Value Received</div>
                        <div className="summary-value" style={{
                            color: 'var(--primary)',
                            fontSize: getFontSize(`$${totalPaidFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            ${totalPaidFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>

                    <div className="summary-card" style={{ borderColor: 'var(--danger)' }}>
                        <div className="summary-label">Pending &gt; 24h (Alert)</div>
                        <div className="summary-value" style={{ color: 'var(--danger)', fontSize: getFontSize(stalePendingTrades) }}>{stalePendingTrades}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-label">Average Payout</div>
                        <div className="summary-value" style={{
                            color: 'var(--success)',
                            fontSize: getFontSize(`GH₵ ${avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            GH₵ {avgPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="summary-card" style={{ borderColor: 'var(--primary)' }}>
                        <div className="summary-label">Average Trade Value</div>
                        <div className="summary-value" style={{
                            color: 'var(--primary)',
                            fontSize: getFontSize(`$${avgFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            ${avgFaceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <Link href="/admin/users" style={{ textDecoration: 'none', display: 'block' }}>
                        <div className="summary-card" style={{ borderColor: 'var(--info)', cursor: 'pointer', height: '100%' }}>
                            <div className="summary-label">Registered Users (Portal)</div>
                            <div className="summary-value" style={{ color: 'var(--info)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '2.25rem' }}>{totalUsers}</span>
                                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Manage &rarr;</span>
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="dashboard-header flex-mobile-col" style={{ marginTop: '4rem' }}>
                    <h2>Platform Analytics Overview</h2>
                </div>

                <ClientMetricsCharts statusData={statusChartData} volumeData={volumeChartData} />

                {recentFailedLogins.length > 0 && (
                    <div style={{ marginTop: '4rem' }}>
                        <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ⚠️ Recent Security Alerts
                            </h2>
                            <p className="dashboard-subtitle">Suspicious or failed login attempts detected.</p>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="table-container" style={{ margin: 0 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Attempted ID</th>
                                            <th>Portal</th>
                                            <th>IP Address</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentFailedLogins.map((alert: any) => (
                                            <tr key={alert.id}>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    {new Date(alert.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{alert.emailOrUsername}</td>
                                                <td><span className="badge" style={{ fontSize: '0.7rem' }}>{alert.portal}</span></td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{alert.ipAddress}</td>
                                                <td>
                                                    <Link href="/admin/logins" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>View Full Logs</Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    } catch (error: any) {
        return (
            <div style={{ padding: '2rem', color: 'var(--danger)' }}>
                <h1>Admin Dashboard Error</h1>
                <pre>{error.message}</pre>
                <pre>{error.stack}</pre>
            </div>
        );
    }
}
