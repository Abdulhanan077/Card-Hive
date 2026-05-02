import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarAutoClose from "@/components/SidebarAutoClose";
import "../user/user.css"; // Reuse dashboard styles
import SidebarNotifications from "./SidebarNotifications";
import AdminNotificationBell from "./AdminNotificationBell";
import LiveTicker from "@/components/LiveTicker";
import SessionTracker from "@/app/components/SessionTracker";
import TradesCounter from "./TradesCounter";
import RewardsCounter from "./RewardsCounter";

import { 
    HiOutlineHome, 
    HiOutlineClipboardList, 
    HiOutlineUsers, 
    HiOutlineGift, 
    HiOutlineTrendingUp, 
    HiOutlineRefresh, 
    HiOutlineSupport, 
    HiOutlineCog, 
    HiOutlineShieldCheck,
    HiOutlineCurrencyDollar,
    HiOutlineEye
} from "react-icons/hi";
import { FaTrophy } from "react-icons/fa";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        redirect("/login");
    }

    return (
        <div className="dashboard-layout">
            <SessionTracker />
            <SidebarAutoClose />
            <input type="checkbox" id="sidebar-toggle" />
            <label htmlFor="sidebar-toggle" className="sidebar-overlay"></label>

            <aside className="sidebar">
                <div className="sidebar-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900 }}>A</div>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>Admin</h3>
                        </div>
                        <label htmlFor="sidebar-toggle" className="mobile-menu-btn" style={{ marginRight: 0, padding: 0 }} aria-label="Close menu">✕</label>
                    </div>
                </div>
                <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0.5rem 0' }}>
                    <Link href="/admin" className="sidebar-link">
                        <HiOutlineHome size={20} />
                        Dashboard Home
                    </Link>
                    <Link href="/admin/trades" className="sidebar-link">
                        <HiOutlineClipboardList size={20} />
                        <span style={{ flex: 1 }}>Manage Trades</span>
                        <TradesCounter />
                    </Link>
                    <Link href="/admin/users" className="sidebar-link">
                        <HiOutlineUsers size={20} />
                        Registered Users
                    </Link>
                    <Link href="/admin/rewards" className="sidebar-link">
                        <HiOutlineGift size={20} />
                        <span style={{ flex: 1 }}>Reward Redemptions</span>
                        <RewardsCounter />
                    </Link>
                    
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '1.5rem 0 0.5rem 1rem' }}>
                        Settings & Tools
                    </div>
                    
                    <Link href="/admin/rates" className="sidebar-link">
                        <HiOutlineTrendingUp size={20} />
                        Manage Rates
                    </Link>
                    <Link href="/admin/status-updates" className="sidebar-link">
                        <HiOutlineRefresh size={20} />
                        Status Updates
                    </Link>
                    <Link href="/admin/leaderboard" className="sidebar-link">
                        <FaTrophy size={18} />
                        Leaderboard
                    </Link>
                    <Link href="/admin/support" className="sidebar-link">
                        <HiOutlineSupport size={20} />
                        <span style={{ flex: 1 }}>Live Support</span>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                    </Link>
                    <Link href="/admin/settings" className="sidebar-link">
                        <HiOutlineCog size={20} />
                        Site Settings
                    </Link>
                    <Link href="/admin/logins" className="sidebar-link">
                        <HiOutlineShieldCheck size={20} />
                        Security Logs
                    </Link>
                    <Link href="/admin/balance-checkers" className="sidebar-link">
                        <HiOutlineCurrencyDollar size={20} />
                        Balance Checkers
                    </Link>
                    <Link href="/admin/visitors" className="sidebar-link">
                        <HiOutlineEye size={20} />
                        Visitor Analytics
                    </Link>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
                        <LogoutButton />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--warning)', margin: '0 0 0.75rem 1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Recent Alerts
                        </div>
                        <SidebarNotifications />
                    </div>
                </nav>
            </aside>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
                <div className="admin-top-bar" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 2rem',
                    backgroundColor: 'var(--background)',
                    borderBottom: '1px solid var(--border)',
                    zIndex: 1100
                }}>
                    <div className="desktop-only" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Admin Panel</span>
                    </div>
                    <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label htmlFor="sidebar-toggle" className="mobile-menu-btn" aria-label="Open menu">☰</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img src="/logo.png" alt="MyCardHive Logo" style={{ height: '24px', width: 'auto' }} />
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>MyCardHive</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <AdminNotificationBell />
                        <div className="desktop-only" style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {session.user.username?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>@{session.user.username}</span>
                        </div>
                    </div>
                </div>
                <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
                <LiveTicker />
            </div>
        </div>
    );
}

