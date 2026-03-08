import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { calculateVipTier, getNextVipTier } from "@/lib/vipTiers";
import ReferralLinkCopy from "@/components/ReferralLinkCopy";
import { FaApple, FaSteam, FaXbox, FaGooglePlay, FaAmazon } from 'react-icons/fa';
import { SiRazer } from 'react-icons/si';
import StatusUpdatesCarousel from "@/components/StatusUpdatesCarousel";

// Helper function to map brand names to icons
const getBrandIcon = (brandName: string) => {
    const lower = brandName.toLowerCase();
    if (lower.includes('apple') || lower.includes('itunes')) return <FaApple size={20} color="#000" />;
    if (lower.includes('steam')) return <FaSteam size={20} color="#1b2838" />;
    if (lower.includes('xbox')) return <FaXbox size={20} color="#107C10" />;
    if (lower.includes('google') || lower.includes('play')) return <FaGooglePlay size={20} color="#3BCCFF" />;
    if (lower.includes('amazon')) return <FaAmazon size={20} color="#FF9900" />;
    if (lower.includes('razer')) return <SiRazer size={20} color="#00FF00" />;
    return <span style={{ fontSize: '1.2rem' }}>💳</span>; // Fallback
};

export default async function UserDashboardHome() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    const userId = parseInt(session.user.id);

    // Fetch data in parallel to reduce connection holding time
    const [userData, recentTrades, settings, topRates] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.trade.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 3
        }),
        prisma.settings.findFirst(),
        prisma.cardRate.findMany({
            take: 5,
            orderBy: { rate: 'desc' }
        })
    ]);

    return (
        <div className="modern-dashboard">
            {/* Warning Banner (Optional, keeping consistent with screenshot style) */}
            {userData?.status === 'ACTIVE' && (
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', color: '#1e3a8a' }}>
                    <div style={{ backgroundColor: '#2563eb', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>i</div>
                    <div style={{ fontSize: '0.9rem' }}>
                        <strong>Welcome to Card Hive!</strong> Keep submitting gift cards to climb the VIP Tiers and multiply your Reward Points.
                    </div>
                </div>
            )}

            <StatusUpdatesCarousel />

            <div className="dashboard-grid">

                {/* LEFT COLUMN */}
                <div className="grid-left" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Latest Promotions Banner */}
                    <div className="promo-banner card">
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>Latest Promotions</h2>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem', maxWidth: '80%', marginBottom: '1.5rem' }}>
                                Discover the best exchange rates and start selling your unused gift cards today to maximize your payouts.
                            </p>
                            <Link href="/user/sell" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', fontWeight: 'bold', padding: '0.5rem 1.5rem' }}>
                                Sell Now
                            </Link>
                        </div>
                    </div>

                    {/* Dual Cards Row: Wallet & Active Coupons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

                        {/* My Wallet */}
                        <div className="wallet-card card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                                    <span>💼</span> My Wallet (Reward Pts)
                                </h3>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>
                                {userData?.rewardBalance?.toLocaleString() || 0} <span style={{ fontSize: '1rem', opacity: 0.8 }}>pts</span>
                            </div>
                            <Link href="/user/rewards" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary)', width: '100%', marginTop: '1rem', fontWeight: 'bold' }}>
                                View Rewards
                            </Link>
                        </div>

                        {/* Referrals Block (Replacing "Coupons") */}
                        <div className="referral-card card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: 'white', fontSize: '1.1rem' }}>Refer Friends</h3>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>Earn Bonus Pts</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ color: 'white', fontSize: '0.85rem', opacity: 0.9 }}>
                                    Share your code and earn a percentage of their first trade as points!
                                </p>
                                <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'gray', marginBottom: '0.2rem' }}>Your Referral Link:</div>
                                    <ReferralLinkCopy referralCode={userData?.referralCode || null} />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Quick Access Icons */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Quick Actions</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            <Link href="/user/sell" className="quick-action-btn">
                                <span className="action-icon" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>💳</span>
                                <span>Sell Card</span>
                            </Link>
                            <Link href="/user/trades" className="quick-action-btn">
                                <span className="action-icon" style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}>📊</span>
                                <span>History</span>
                            </Link>
                            <Link href="/user/settings" className="quick-action-btn">
                                <span className="action-icon" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>⚙️</span>
                                <span>Settings</span>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Recent Trades</h3>
                            <Link href="/user/trades" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>View All</Link>
                        </div>

                        {recentTrades.length === 0 ? (
                            <p style={{ color: 'gray', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No recent activity.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recentTrades.map(trade => (
                                    <div key={trade.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '50%',
                                                backgroundColor: trade.status === 'PAID' ? '#dcfce7' : (trade.status === 'REJECTED' ? '#fee2e2' : '#fef3c7'),
                                                color: trade.status === 'PAID' ? '#16a34a' : (trade.status === 'REJECTED' ? '#ef4444' : '#d97706'),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                            }}>
                                                {trade.status === 'PAID' ? '✓' : (trade.status === 'REJECTED' ? '✕' : '⏳')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{trade.cardBrand}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'gray' }}>{new Date(trade.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 'bold', color: trade.status === 'PAID' ? 'var(--success)' : 'var(--foreground)' }}>
                                                {trade.faceValue} {trade.currency}
                                            </div>
                                            <div className={`badge badge-${trade.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                                                {trade.status.replace("_", " ")}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="grid-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Top Selling Gift Cards */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem' }}>Top Rates Today</h3>
                            <Link href="/user/sell" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>Trade Now</Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {topRates.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'gray' }}>No active rates to display.</p>
                            ) : (
                                topRates.map(rate => (
                                    <div key={rate.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ backgroundColor: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                {getBrandIcon(rate.cardBrand)}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rate.cardBrand} <span style={{ fontSize: '0.75rem', color: 'gray', fontWeight: 'normal' }}>({rate.cardCountry})</span></div>
                                        </div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                            {rate.rate} <span style={{ fontSize: '0.7rem', color: 'gray' }}>GHS/$</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Support Links */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Support</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <a href={`https://wa.me/${(settings?.whatsappNumber || "").replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s' }} className="hover-bg-light">
                                <div style={{ backgroundColor: '#dcfce7', color: '#16a34a', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    <span>💬</span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>WhatsApp Support</div>
                                    <div style={{ fontSize: '0.8rem', color: 'gray' }}>{settings?.whatsappNumber || "Message us!"}</div>
                                </div>
                            </a>

                            <a href={`mailto:${settings?.contactEmail || "support@omorbiggy.com"}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s' }} className="hover-bg-light">
                                <div style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    <span>✉️</span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Email Support</div>
                                    <div style={{ fontSize: '0.8rem', color: 'gray' }}>{settings?.contactEmail || "Drop us a line!"}</div>
                                </div>
                            </a>
                        </div>
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .modern-dashboard {
                    padding-bottom: 2rem;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 1.5rem;
                    align-items: start;
                }
                .promo-banner {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border: none;
                    position: relative;
                    overflow: hidden;
                    padding: 2.5rem 2rem;
                }
                /* Decorative background element for banner */
                .promo-banner::after {
                    content: '';
                    position: absolute;
                    right: -20px;
                    bottom: -50px;
                    width: 200px;
                    height: 200px;
                    background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
                    border-radius: 50%;
                    z-index: 1;
                }
                .wallet-card {
                    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
                    border: none;
                }
                .referral-card {
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    border: none;
                }
                .quick-action-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    min-width: 100px;
                    padding: 1rem;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    text-decoration: none;
                    color: var(--foreground);
                    font-weight: 500;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .quick-action-btn:hover {
                    border-color: var(--primary);
                    background-color: var(--surface-hover);
                    transform: translateY(-2px);
                }
                .action-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }
                .hover-bg-light:hover {
                    background-color: var(--surface-hover);
                }

                @media (max-width: 1024px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}} />
        </div>
    );
}
