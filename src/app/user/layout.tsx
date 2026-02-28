import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import SidebarAutoClose from "@/components/SidebarAutoClose";
import "./user.css";

export default async function UserLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    return (
        <div className="dashboard-layout">
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
                    <Link href="/user/settings" className="sidebar-link">Settings</Link>
                    <Link href="/user/security" className="sidebar-link">Security & Sessions</Link>

                    <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <LogoutButton />
                    </div>
                </nav>
            </aside>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
                <div className="mobile-top-bar">
                    <label htmlFor="sidebar-toggle" className="mobile-menu-btn" aria-label="Open menu">☰</label>
                    <span style={{ fontWeight: 600 }}>🛍️ Card Hive</span>
                </div>
                <main className="dashboard-main" style={{ flex: 1, overflowY: 'auto' }}>
                    {children}
                </main>
            </div>
        </div>
    );
}
