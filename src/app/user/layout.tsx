import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarAutoClose from "@/components/SidebarAutoClose";
import SessionTracker from "@/app/components/SessionTracker";
import UserNotificationBell from "./UserNotificationBell";
import LiveTicker from "@/components/LiveTicker";
import "./user.css";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const userId = parseInt(session.user.id);

    // Fetch Lifetime Stats
    const stats = await prisma.trade.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
        _sum: { calculatedPayout: true, faceValue: true }
    });

    const totalTrades = stats.reduce((acc, s) => acc + s._count._all, 0);
    const pendingTrades = stats.filter(s => s.status === 'PENDING' || s.status === 'UNDER_REVIEW' || s.status === 'REVIEWING').reduce((acc, s) => acc + s._count._all, 0);
    const successfulTrades = stats.filter(s => s.status === 'PAID' || s.status === 'COMPLETED').reduce((acc, s) => acc + s._count._all, 0);
    const rejectedTrades = stats.filter(s => s.status === 'REJECTED').reduce((acc, s) => acc + s._count._all, 0);

    const totalCedis = stats.filter(s => s.status === 'PAID' || s.status === 'COMPLETED').reduce((acc, s) => acc + (s._sum.calculatedPayout || 0), 0);
    const totalDollars = stats.filter(s => (s.status === 'PAID' || s.status === 'COMPLETED')).reduce((acc, s) => acc + (s._sum.faceValue || 0), 0);

    return (
        <div className="dashboard-layout">
            <SessionTracker />
            <SidebarAutoClose />
            <input type="checkbox" id="sidebar-toggle" />
            <label htmlFor="sidebar-toggle" className="sidebar-overlay"></label>

            <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>User Panel</h3>
                        <label htmlFor="sidebar-toggle" className="mobile-menu-btn" style={{ marginRight: 0, padding: 0 }} aria-label="Close menu">✕</label>
                    </div>
                    <p className="sidebar-user">@{session.user.username}</p>
                </div>
                <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Link href="/user" className="sidebar-link">Dashboard Home</Link>
                    <Link href="/user/sell" className="sidebar-link btn-primary" style={{ color: 'white', marginTop: '1rem' }}>
                        + Sell Gift Card
                    </Link>
                    <Link href="/user/trades" className="sidebar-link">My Trades</Link>
                    <Link href="/user/leaderboard" className="sidebar-link">Leaderboard</Link>
                    <Link href="/user/referrals" className="sidebar-link">Referrals</Link>
                    <Link href="/user/settings" className="sidebar-link">Settings</Link>
                    <Link href="/user/security" className="sidebar-link">Security & Sessions</Link>

                    {/* Lifetime Statistics Section */}
                    <div className="sidebar-stats-section">
                        <h4 className="stats-header">Lifetime Statistics</h4>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Total Trades</span>
                                <span className="stat-value">{totalTrades}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending</span>
                                <span className="stat-value text-warning">{pendingTrades}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Successful</span>
                                <span className="stat-value text-success">{successfulTrades}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Rejected</span>
                                <span className="stat-value text-danger">{rejectedTrades}</span>
                            </div>
                        </div>
                        <div className="stats-money">
                            <div className="money-item">
                                <span className="money-label">Total Received (₵)</span>
                                <span className="money-value">₵ {totalCedis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="money-item">
                                <span className="money-label">Total Volume ($)</span>
                                <span className="money-value">$ {totalDollars.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <LogoutButton />
                    </div>
                </nav>
            </aside>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
                <div className="mobile-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label htmlFor="sidebar-toggle" className="mobile-menu-btn" aria-label="Open menu">☰</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img src="/logo.png" alt="Card Hive Logo" style={{ height: '24px', width: 'auto' }} />
                            <span style={{ fontWeight: 600 }}>Card Hive</span>
                        </div>
                    </div>
                    <UserNotificationBell />
                </div>
                <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
                <LiveTicker />
            </div>
        </div>
    );
}
