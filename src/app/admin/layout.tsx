import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarAutoClose from "@/components/SidebarAutoClose";
import "../user/user.css"; // Reuse dashboard styles
import SidebarNotifications from "./SidebarNotifications";
import AdminNotificationBell from "./AdminNotificationBell";
import SessionTracker from "@/app/components/SessionTracker";

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
                <div className="sidebar-header" style={{ borderColor: 'var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ color: 'var(--primary)' }}>Admin Portal</h3>
                        <label htmlFor="sidebar-toggle" className="mobile-menu-btn" style={{ marginRight: 0, padding: 0 }} aria-label="Close menu">✕</label>
                    </div>
                    <p className="sidebar-user">@{session.user.username}</p>
                </div>
                <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Link href="/admin" className="sidebar-link">Dashboard Home</Link>
                    <Link href="/admin/trades" className="sidebar-link">Manage Trades</Link>
                    <Link href="/admin/users" className="sidebar-link">Registered Users</Link>
                    <Link href="/admin/rewards" className="sidebar-link">Reward Redemptions</Link>
                    <Link href="/admin/rates" className="sidebar-link">Manage Rates</Link>
                    <Link href="/admin/status-updates" className="sidebar-link">Status Updates</Link>
                    <Link href="/admin/settings" className="sidebar-link">Site Settings</Link>
                    <Link href="/admin/logins" className="sidebar-link" style={{ color: 'var(--success)' }}>Security Logs</Link>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', marginBottom: '1rem' }}>
                        <LogoutButton />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pending Actions
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
                            <img src="/logo.png" alt="Card Hive Logo" style={{ height: '24px', width: 'auto' }} />
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Card Hive</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <AdminNotificationBell />
                        <div className="desktop-only" style={{ height: '24px', width: '1px', backgroundColor: 'var(--border)' }}></div>
                        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {session.user.username?.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>@{session.user.username}</span>
                        </div>
                    </div>
                </div>
                <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
