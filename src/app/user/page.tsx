import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { calculateVipTier, getNextVipTier } from "@/lib/vipTiers";
import ReferralLinkCopy from "@/components/ReferralLinkCopy";
import { FaApple, FaSteam, FaXbox, FaGooglePlay, FaAmazon } from 'react-icons/fa';
import { SiRazer } from 'react-icons/si';
import StatusUpdatesCarousel from "@/components/StatusUpdatesCarousel";
import { formatCategoryWithFlag } from "@/lib/categoryUtils";

// Helper function to map brand names to icons
const getBrandIcon = (brandName: string) => {
    const lower = brandName.toLowerCase();
    if (lower.includes('apple') || lower.includes('itunes')) return <FaApple size={20} color="var(--foreground)" />;
    if (lower.includes('steam')) return <FaSteam size={20} color="var(--foreground)" />;
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

    // Fetch data sequentially to avoid connection pool exhaustion
    const userData = await prisma.user.findUnique({ 
        where: { id: userId },
        select: {
            id: true,
            username: true,
            status: true,
            rewardBalance: true,
            completedTradesCount: true,
        }
    });
    
    // Use the manual count from user record for VIP status calculation (allows admin overrides)
    const vipPoints = userData?.completedTradesCount || 0;
    
    // Also fetch actual completed trades for displaying in stats if needed
    const actualCompletedTrades = await prisma.trade.count({
        where: { 
            userId,
            status: { in: ['PAID', 'COMPLETED'] }
        }
    });

    const getVipBadgeStyle = (tierName: string, baseColor: string) => {
        let style: any = {
            backgroundColor: baseColor,
            color: 'white',
            padding: '0.3rem 0.85rem',
            borderRadius: '100px',
            fontSize: '0.75rem',
            fontWeight: 800,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block'
        };

        if (tierName === 'Platinum') {
            style.background = 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)';
            style.border = '1px solid rgba(255,255,255,0.3)';
        } else if (tierName === 'Gold') {
            style.background = 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
        } else if (tierName === 'Silver') {
            style.background = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
        } else if (tierName === 'Bronze') {
            style.background = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
        }

        return style;
    };

    const recentTrades = await prisma.trade.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3
    });
    
    let settings = null;
    try {
        settings = await prisma.settings.findFirst();
    } catch (e) {
        console.error("Dashboard: Could not fetch site settings", e);
    }

    const topRates = await prisma.cardRate.findMany({
        take: 5,
        orderBy: { rate: 'desc' }
    });

    return (
        <div className="modern-dashboard">
            {/* Warning Banner (Optional, keeping consistent with screenshot style) */}
            {userData?.status === 'ACTIVE' && (
                <div style={{ backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
                    <div style={{ backgroundColor: 'var(--primary)', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>i</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--foreground)' }}>
                        <strong style={{ color: 'var(--primary)' }}>Welcome to MyCardHive!</strong> Keep submitting gift cards to climb the VIP Tiers and multiply your Reward Points.
                    </div>
                </div>
            )}

            <StatusUpdatesCarousel />

            <div className="dashboard-grid">

                {/* LEFT COLUMN */}
                <div className="grid-left" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

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
                    <div className="responsive-grid">

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

                        {/* Referrals Block linking to dedicated page */}
                        <div className="referral-card card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ color: 'white', fontSize: '1.1rem' }}>Referral Rewards</h3>
                                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>New!</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ color: 'white', fontSize: '0.85rem', opacity: 0.9 }}>
                                    Your personal dashboard is ready. Track your referrals, bonuses, and earnings in one place!
                                </p>
                                <Link href="/user/referrals" className="btn" style={{ backgroundColor: 'white', color: '#1d4ed8', width: '100%', marginTop: '0.5rem', fontWeight: 'bold', textAlign: 'center' }}>
                                    Open Referrals Hub
                                </Link>
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
                                                backgroundColor: trade.status === 'PAID' ? 'var(--success-light)' : (trade.status === 'REJECTED' ? 'var(--danger-light)' : 'var(--warning-light)'),
                                                color: trade.status === 'PAID' ? 'var(--success)' : (trade.status === 'REJECTED' ? 'var(--danger)' : 'var(--warning)'),
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem'
                                            }}>
                                                {trade.status === 'PAID' ? '✓' : (trade.status === 'REJECTED' ? '✕' : '⏳')}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{trade.cardBrand}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(trade.createdAt).toLocaleDateString()}</div>
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
                <div className="grid-right" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>

                    {/* VIP Status Card */}
                    {userData && (
                        <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)', color: 'white', border: 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                                <h3 style={{ fontSize: '1.1rem', color: 'white' }}>VIP Status</h3>
                                <span style={getVipBadgeStyle(calculateVipTier(vipPoints).name, calculateVipTier(vipPoints).color)}>
                                    {calculateVipTier(vipPoints).name}
                                </span>
                            </div>
                            
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                                    {vipPoints} <span style={{ fontSize: '0.85rem', fontWeight: 500, opacity: 0.8 }}>VIP Pts</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Accumulated from successful trades</div>
                            </div>

                            {(() => {
                                const currentTier = calculateVipTier(vipPoints);
                                const nextTier = getNextVipTier(currentTier.level);
                                if (!nextTier) return <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>Max Tier Reached! 👑</div>;
                                
                                const progress = Math.min(100, Math.max(0, ((vipPoints - currentTier.minTrades) / (nextTier.minTrades - currentTier.minTrades)) * 100));
                                
                                return (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                            <span>Progress to {nextTier.name}</span>
                                            <span>{vipPoints} / {nextTier.minTrades} Pts</span>
                                        </div>
                                        <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${progress}%`, backgroundColor: currentTier.color, borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                                            Benefit: {nextTier.multiplier}x Reward Multiplier
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

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
                                            <div style={{ backgroundColor: 'var(--surface-hover)', border: '1px solid var(--border)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                                {getBrandIcon(rate.cardBrand)}
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rate.cardBrand} <span style={{ fontSize: '0.75rem', color: 'gray', fontWeight: 'normal' }}>({formatCategoryWithFlag(rate.cardCountry)})</span></div>
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
                                <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    <span>💬</span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>WhatsApp Support</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{settings?.whatsappNumber || "Message us!"}</div>
                                </div>
                            </a>

                            <a href={`mailto:${settings?.contactEmail || "support@omorbiggy.com"}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'inherit', transition: 'background-color 0.2s' }} className="hover-bg-light">
                                <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                    <span>✉️</span>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Email Support</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{settings?.contactEmail || "Drop us a line!"}</div>
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
                .responsive-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 1.5rem;
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

