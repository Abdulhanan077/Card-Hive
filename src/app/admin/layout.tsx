import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarAutoClose from "@/components/SidebarAutoClose";
import "../user/user.css"; // Reuse dashboard styles
import SidebarNotifications from "./SidebarNotifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        redirect("/login");
    }

    return (
        <div className="dashboard-layout">
            <SidebarAutoClose />
            <input type="checkbox" id="sidebar-toggle" />
            <label htmlFor="sidebar-toggle" className="sidebar-overlay"></label>

            <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
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
                    <Link href="/admin/rewards" className="sidebar-link" style={{ color: 'var(--warning)' }}>Reward Redemptions</Link>
                    <Link href="/admin/rates" className="sidebar-link">Manage Rates</Link>
                    <Link href="/admin/settings" className="sidebar-link">Site Settings</Link>

                    <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pending Actions
                        </div>
                        <SidebarNotifications />
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <LogoutButton />
                    </div>
                </nav>
            </aside>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
                <div className="mobile-top-bar">
                    <label htmlFor="sidebar-toggle" className="mobile-menu-btn" aria-label="Open menu">☰</label>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Card Hive Admin</span>
                </div>
                <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
