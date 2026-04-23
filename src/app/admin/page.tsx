import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClientMetricsCharts from "./ClientMetricsCharts";
import {
    HiOutlineClipboardList,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCash,
    HiOutlinePresentationChartLine,
    HiOutlineExclamation,
    HiOutlineUsers,
    HiOutlineShieldCheck
} from "react-icons/hi";

export default async function AdminDashboardHome() {
    try {
        const statusCounts: any[] = await prisma.$queryRaw`
            SELECT status, COUNT(*)::int as count 
            FROM "Trade" 
            GROUP BY status
        `;

        const counts: Record<string, number> = statusCounts.reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.status] = curr.count;
            return acc;
        }, {});

        const totalTrades = Object.values(counts).reduce((a, b) => a + b, 0);
        const underReviewTrades = counts["UNDER_REVIEW"] || 0;
        const pendingTrades = (counts["PENDING"] || 0) + underReviewTrades; // Include Under Review in Pending Queue for the card
        const paidTrades = (counts["PAID"] || 0) + (counts["COMPLETED"] || 0);
        const rejectedTrades = counts["REJECTED"] || 0;

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

        const paidStats = await prisma.trade.aggregate({
            where: { status: { in: ["PAID", "COMPLETED"] } },
            _sum: { calculatedPayout: true, faceValue: true },
            _avg: { calculatedPayout: true }
        });
        const totalCedisPaid = paidStats._sum.calculatedPayout || 0;
        const totalFaceValue = paidStats._sum.faceValue || 0;
        const avgPayout = paidStats._avg.calculatedPayout || 0;

        const recentFailedLogins = await prisma.loginEvent.findMany({
            where: { success: false },
            orderBy: { createdAt: "desc" },
            take: 12
        });

        const recentTrades = await prisma.trade.findMany({
            orderBy: { createdAt: 'desc' },
            take: 8,
            include: { user: { select: { username: true } } }
        });

        const statusChartData = [
            { name: 'Pending', value: pendingTrades, color: '#f59e0b' },
            { name: 'Reviewing', value: underReviewTrades, color: '#3b82f6' },
            { name: 'Successful', value: paidTrades, color: '#10b981' },
            { name: 'Rejected', value: rejectedTrades, color: '#ef4444' },
        ];

        const volumeChartData = [
            { name: 'Total volume', value: totalTrades }
        ];

        return (
            <div className="admin-dashboard-container">
                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: '0.5rem' }}>
                        Dashboard Overview
                    </h1>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 500 }}>
                        Welcome back. Here's what's happening on the platform today.
                    </p>
                </div>

                <div className="admin-stats-grid">
                    {/* Primary Stats */}
                    <StatCard
                        title="Total Lifetime Trades"
                        value={totalTrades}
                        icon={<HiOutlineClipboardList size={24} />}
                        color="#6366f1"
                    />
                    <StatCard
                        title="Today's Intake"
                        value={dailyTrades}
                        icon={<HiOutlineClock size={24} />}
                        color="var(--primary)"
                        trend="+12% from yesterday"
                    />
                    <StatCard
                        title="Total GHS Paid"
                        value={`₵${Number(totalCedisPaid).toLocaleString('en-US')}`}
                        icon={<HiOutlineCash size={24} />}
                        color="#10b981"
                        subtitle={`Avg: ₵${Number(avgPayout).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    />
                    <StatCard
                        title="Face Value Received"
                        value={`$${Number(totalFaceValue).toLocaleString('en-US')}`}
                        icon={<HiOutlinePresentationChartLine size={24} />}
                        color="#8b5cf6"
                    />

                    {/* Operational Stats */}
                    <StatCard
                        title="Pending Queue"
                        value={pendingTrades}
                        icon={<HiOutlineEye size={24} />}
                        color="#f59e0b"
                        alert={stalePendingTrades > 0 ? `${stalePendingTrades} stale trades` : undefined}
                    />
                    <StatCard
                        title="Successful Trades"
                        value={paidTrades}
                        icon={<HiOutlineCheckCircle size={24} />}
                        color="#10b981"
                    />
                    <StatCard
                        title="Rejected Trades"
                        value={rejectedTrades}
                        icon={<HiOutlineXCircle size={24} />}
                        color="#ef4444"
                    />
                    <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                        <StatCard
                            title="Registered Users"
                            value={totalUsers}
                            icon={<HiOutlineUsers size={24} />}
                            color="#3b82f6"
                            isLink
                        />
                    </Link>
                </div>

                <div className="admin-charts-grid">
                    <div className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                            Platform Analytics
                        </h2>
                        <div style={{ flex: 1, minHeight: '300px' }}>
                            <ClientMetricsCharts statusData={statusChartData} volumeData={volumeChartData} />
                        </div>

                        <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--foreground)' }}>Recent Activity</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recentTrades.map((trade: any) => (
                                    <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: trade.status === 'PAID' ? '#10b981' : '#f59e0b' }}></div>
                                            <span style={{ fontWeight: 600 }}>@{trade.user.username}</span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            {trade.cardBrand} • {trade.currency} {trade.faceValue.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ padding: '2.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444' }}>
                            <HiOutlineShieldCheck size={24} />
                            Recent Security Alerts
                        </h2>
                        {recentFailedLogins.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#94a3b8' }}>
                                No security alerts in the last 24 hours.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recentFailedLogins.map((alert: any) => (
                                    <div key={alert.id} style={{
                                        padding: '1.25rem',
                                        background: 'var(--danger-light)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '1rem' }}>{alert.emailOrUsername}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.2rem', opacity: 0.8 }}>
                                                {alert.portal} Portal • {alert.ipAddress}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--danger)' }}>FAILED</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)', opacity: 0.6 }}>
                                                {new Date(alert.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Link href="/admin/logins" style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
                                    View Security Audit Log →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
                
                <style dangerouslySetInnerHTML={{ __html: `
                    .admin-dashboard-container {
                        padding: 2rem;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    .admin-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                        gap: 1.5rem;
                        margin-bottom: 3rem;
                    }
                    .admin-charts-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        margin-bottom: 4rem;
                    }
                    @media (max-width: 768px) {
                        .admin-dashboard-container {
                            padding: 1rem;
                        }
                        .admin-stats-grid {
                            grid-template-columns: 1fr;
                            gap: 1rem;
                            margin-bottom: 2rem;
                        }
                        .admin-charts-grid {
                            grid-template-columns: 1fr;
                            gap: 1.5rem;
                            margin-bottom: 2rem;
                        }
                    }
                `}} />
            </div>
        );
    } catch (error: any) {
        return (
            <div style={{ padding: '2rem', color: 'var(--danger)' }}>
                <h1>Dashboard Maintenance</h1>
                <p>We're currently updating the metrics. Please refresh in a moment.</p>
            </div>
        );
    }
}

function StatCard({ title, value, icon, color, trend, subtitle, alert, isLink }: any) {
    return (
        <div className="card" style={{
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden',
            borderBottom: `4px solid ${color}`
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: `${color}15`,
                    color: color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </div>
                {isLink && <span style={{ color: '#94a3b8', fontSize: '1.25rem' }}>→</span>}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                {title}
            </div>

            <div style={{
                fontSize: String(value).length > 8 ? '1.75rem' : '2.25rem',
                fontWeight: 900,
                color: 'var(--foreground)',
                letterSpacing: '-0.02em',
                marginBottom: '0.25rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>
                {value}
            </div>

            {trend && <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{trend}</div>}
            {subtitle && <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{subtitle}</div>}
            {alert && <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HiOutlineExclamation /> {alert}
            </div>}
        </div>
    );
}
