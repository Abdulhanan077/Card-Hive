"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaShareAlt, FaUsers, FaCheckCircle, FaCoins, FaCopy, FaFacebook, FaTwitter, FaWhatsapp, FaTelegram, FaSms, FaEnvelope } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from "react-hot-toast";

export default function ReferralsPage() {
    const { data: session } = useSession();
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState({
        invitesSent: 0,
        registrations: 0,
        activeReferrals: 0,
        totalEarnings: 0
    });
    const [referralsList, setReferralsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReferralData = async () => {
            try {
                const res = await fetch('/api/user/referral-stats');
                const result = await res.json();
                if (result.success) {
                    setUserData(result.userData);
                    setStats(result.stats);
                    setReferralsList(result.referralsList || []);
                }
            } catch (error) {
                console.error("Failed to fetch referral stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReferralData();
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!", {
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    const referralLink = userData?.referralCode 
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${userData.referralCode}` 
        : "";

    const shareText = "Trade gift cards and crypto on MyCardHive! Use my referral code to get started:";
    const shareSubject = "Join MyCardHive and Start Trading!";
    
    const handleShare = (platform: string) => {
        if (!referralLink) return;
        
        const urls: Record<string, string> = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + " " + referralLink)}`,
            telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
            sms: `sms:?body=${encodeURIComponent(shareText + " " + referralLink)}`,
            email: `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareText + " " + referralLink)}`
        };

        if (urls[platform]) {
            if (platform === 'sms' || platform === 'email') {
                window.location.href = urls[platform];
            } else {
                window.open(urls[platform], '_blank', 'noreferrer');
            }
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Referrals Dashboard...</div>;

    const hasReferrals = stats.registrations > 0;
    const earningsBreakdown = [
        { name: 'Signup Bonuses', value: hasReferrals ? stats.totalEarnings * 0.2 : 0 },
        { name: 'Milestone Bonuses', value: hasReferrals ? stats.totalEarnings * 0.3 : 0 },
        { name: 'Commissions', value: hasReferrals ? stats.totalEarnings * 0.5 : 0 },
    ];

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 700 }}>Referrals</h1>

            {/* Referral Code Hero Section */}
            <div className="referral-hero">
                <button 
                    onClick={() => copyToClipboard(userData?.referralCode)}
                    className="copy-btn-top"
                >
                    <FaCopy /> Copy
                </button>
                <h2 className="hero-title">Your Referral Code</h2>
                <p className="hero-subtitle">Share your code and earn rewards when friends join!</p>
                
                <div className="code-container">
                    <div className="code-box">
                        <div className="box-label">Code</div>
                        <div className="box-value">{userData?.referralCode || "---"}</div>
                    </div>
                    
                    <div className="link-box">
                        <div className="link-info">
                            <div className="box-label">Referral Link</div>
                            <div className="link-text">{referralLink}</div>
                        </div>
                        <button onClick={() => copyToClipboard(referralLink)} className="copy-link-btn">
                            <FaCopy />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="stats-row">
                <StatsCard icon={<FaShareAlt color="#4f46e5" />} value={stats.invitesSent} label="Invites Sent" />
                <StatsCard icon={<FaUsers color="#10b981" />} value={stats.registrations} label="Registrations" />
                <StatsCard icon={<FaCheckCircle color="#3b82f6" />} value={stats.activeReferrals} label="Qualified Referrals" />
                <StatsCard icon={<FaCoins color="#f59e0b" />} value={`GHS ${stats.totalEarnings.toLocaleString()}`} label="Total Earnings" />
            </div>

            <div className="dashboard-grid">
                {/* Left Side: Share & QR */}
                <div className="card share-card">
                    <h3 className="section-title">Share Your Code</h3>
                    <p className="section-subtitle">Social Media</p>
                    <div className="social-grid">
                        <SocialBtn icon={<FaFacebook />} label="Facebook" color="#1877F2" onClick={() => handleShare('facebook')} />
                        <SocialBtn icon={<FaTwitter />} label="Twitter" color="#1DA1F2" onClick={() => handleShare('twitter')} />
                        <SocialBtn icon={<FaWhatsapp />} label="WhatsApp" color="#25D366" onClick={() => handleShare('whatsapp')} />
                        <SocialBtn icon={<FaTelegram />} label="Telegram" color="#0088cc" onClick={() => handleShare('telegram')} />
                    </div>
                    
                    <p className="section-subtitle">Messaging</p>
                    <div className="messaging-row">
                        <button onClick={() => handleShare('sms')} className="msg-btn">
                            <FaSms /> SMS
                        </button>
                        <button onClick={() => handleShare('email')} className="msg-btn">
                            <FaEnvelope /> Email
                        </button>
                    </div>

                    {referralLink && (
                        <div className="qr-section">
                            <p className="section-subtitle">QR Code</p>
                            <div className="qr-container">
                                <div className="qr-box">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(referralLink)}`} 
                                        alt="QR Code" 
                                        className="qr-img"
                                    />
                                </div>
                                <p className="qr-hint">Scan to share your referral code</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Earnings Breakdown */}
                <div className="card earnings-card">
                    <h3 className="section-title">Earnings Breakdown</h3>
                    
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={earningsBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="var(--text-muted)" />
                                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="var(--text-muted)" />
                                <Tooltip cursor={{ fill: 'var(--bg-alt)' }} contentStyle={{ backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', color: 'var(--foreground)' }} />
                                <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="breakdown-grid">
                        <BreakdownItem label="Signup Bonuses" value={earningsBreakdown[0].value} color="#8b5cf6" />
                        <BreakdownItem label="Milestone Bonuses" value={earningsBreakdown[1].value} color="#10b981" />
                        <BreakdownItem label="Commissions" value={earningsBreakdown[2].value} color="#f59e0b" />
                    </div>
                </div>
            </div>

            {/* My Referrals Traditional Table */}
            <div className="card referrals-card">
                <h3 className="card-title">My Referrals</h3>
                <div className="table-description">
                    A detailed list of all users you have invited and their current status.
                </div>
                <div className="table-responsive">
                    <table className="referrals-table">
                        <colgroup>
                            <col style={{ width: '30%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '30%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="text-left">USER</th>
                                <th className="text-right">JOINED</th>
                                <th className="text-right">POINTS</th>
                                <th className="text-right">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {referralsList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="empty-cell">
                                        No referrals yet. Share your code to start earning!
                                    </td>
                                </tr>
                            ) : (
                                referralsList.map((ref, idx) => (
                                    <tr key={idx} className="rank-row-tr">
                                        <td>
                                            <div className="user-info">
                                                <span className="username">@{ref.username}</span>
                                            </div>
                                        </td>
                                        <td className="text-right date-cell">
                                            {new Date(ref.joinedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' })}
                                        </td>
                                        <td className="text-right points-cell highlight">
                                            +{ref.pointsEarned ?? 0}
                                        </td>
                                        <td className="text-right">
                                            <div className="status-badges">
                                                {ref.status === 'BLOCKED' && (
                                                    <span className="badge-blocked">Blocked</span>
                                                )}
                                                <span className={`badge-active ${ref.isActive ? 'qualified' : 'pending'}`}>
                                                    {ref.isActive ? 'Qualified' : 'Pending'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                .card {
                    background: var(--surface);
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    padding: 1.5rem;
                }
                .section-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; }
                .section-subtitle { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem; }
                
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 2rem;
                }
                @media (min-width: 992px) {
                    .dashboard-grid { grid-template-columns: 1fr 1fr; }
                }

                .social-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
                .messaging-row { display: flex; gap: 0.5rem; }
                .msg-btn { 
                    flex: 1; 
                    padding: 0.75rem; 
                    border: 1px solid var(--border); 
                    border-radius: 8px; 
                    background: var(--surface-hover); 
                    color: var(--foreground); 
                    font-size: 0.85rem; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 0.5rem; 
                    cursor: pointer; 
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .msg-btn:hover { background: var(--bg-alt); scale: 0.98; }

                .qr-section { margin-top: 2.5rem; border-top: 1px solid var(--border); paddingTop: 1.5rem; }
                .qr-container { text-align: center; }
                .qr-box { 
                    width: 120px; 
                    height: 120px; 
                    margin: 0 auto 1rem; 
                    background: white; 
                    padding: 10px; 
                    border: 1px solid var(--border); 
                    border-radius: 12px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .qr-img { width: 100px; height: 100px; }
                .qr-hint { font-size: 0.75rem; color: var(--text-muted); }

                .chart-container { height: 300px; width: 100%; }
                .breakdown-grid { 
                    display: grid; 
                    grid-template-columns: 1fr; 
                    gap: 1rem; 
                    margin-top: 2rem; 
                }
                @media (min-width: 480px) {
                    .breakdown-grid { grid-template-columns: repeat(3, 1fr); }
                }

                .referral-hero {
                    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                    border-radius: 16px;
                    padding: 2.5rem;
                    color: white;
                    margin-bottom: 2rem;
                    position: relative;
                    box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);
                }
                .hero-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
                .hero-subtitle { font-size: 0.95rem; opacity: 0.9; margin-bottom: 2rem; }
                
                .copy-btn-top {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s;
                }
                .copy-btn-top:hover { background: rgba(255,255,255,0.25); }

                .code-container { display: flex; flex-direction: column; gap: 1rem; }
                .code-box, .link-box {
                    background: rgba(0,0,0,0.2);
                    padding: 1.25rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .box-label { font-size: 0.75rem; opacity: 0.7; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
                .box-value { font-size: 1.5rem; font-weight: 900; letter-spacing: 1px; }
                
                .link-box { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
                .link-info { overflow: hidden; }
                .link-text { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.95; }
                .copy-link-btn { border: none; background: rgba(255,255,255,0.1); color: white; padding: 0.6rem; border-radius: 8px; cursor: pointer; transition: 0.2s; }
                .copy-link-btn:hover { background: rgba(255,255,255,0.2); }

                .stats-row {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .referrals-card { padding: 0 !important; overflow: hidden; margin-top: 2rem; }
                .card-title { padding: 1.5rem 1.5rem 0.5rem; font-size: 1.25rem; font-weight: 800; }
                .table-description {
                    padding: 0 1.5rem 0.75rem;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    line-height: 1.5;
                }
                
                .table-responsive {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .referrals-table {
                    display: table !important;
                    width: 100% !important;
                    min-width: 650px;
                    border-collapse: collapse !important;
                    text-align: left;
                    table-layout: fixed !important;
                    border: 1px solid var(--border);
                }
                .referrals-table thead { display: table-header-group !important; }
                .referrals-table tbody { display: table-row-group !important; }
                .referrals-table tr { display: table-row !important; }
                .referrals-table th, .referrals-table td {
                    display: table-cell !important;
                    padding: 1rem 0.75rem !important;
                    vertical-align: middle;
                    border: 1px solid var(--border);
                    box-sizing: border-box !important;
                    overflow: hidden;
                }
                .referrals-table th {
                    background: var(--bg-alt);
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                /* Explicit Column Widths */
                .referrals-table th:nth-child(1), .referrals-table td:nth-child(1) { width: 30% !important; }
                .referrals-table th:nth-child(2), .referrals-table td:nth-child(2) { width: 20% !important; }
                .referrals-table th:nth-child(3), .referrals-table td:nth-child(3) { width: 20% !important; }
                .referrals-table th:nth-child(4), .referrals-table td:nth-child(4) { width: 30% !important; }
                .rank-row-tr:last-child td { border-bottom: none; }
                .rank-row-tr:hover td { background: var(--bg-alt); }

                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .username { font-weight: 700; color: var(--foreground); }

                .date-cell { opacity: 0.6; font-size: 0.85rem; }
                .highlight { color: var(--primary); font-weight: 900; font-size: 1.1rem; }
                
                .status-badges { display: flex; gap: 0.4rem; justify-content: flex-end; flex-wrap: wrap; }
                .badge-blocked { font-size: 0.6rem; background: var(--danger); color: white; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 800; text-transform: uppercase; }
                .badge-active { padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
                .qualified { background: var(--success-light); color: var(--success); }
                .pending { background: var(--bg-alt); color: var(--text-muted); }
                
                .empty-cell { padding: 4rem 2rem; text-align: center; color: var(--text-muted); font-style: italic; }
 
                 @media (max-width: 768px) {
                    .referral-hero { padding: 1.5rem; }
                    .hero-title { font-size: 1.25rem; }
                    .copy-btn-top { top: 1rem; right: 1rem; padding: 0.4rem 0.75rem; }
                }
 
                @media (max-width: 500px) {
                    .stats-row { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
                }
            `}</style>
        </div>
    );
}

function StatsCard({ icon, value, label }: any) {
    return (
        <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--foreground)' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</div>
        </div>
    );
}

function SocialBtn({ icon, label, color, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.5rem 1rem', 
                borderRadius: '100px', 
                border: 'none', 
                backgroundColor: color, 
                color: 'white', 
                fontSize: '0.8rem',
                cursor: 'pointer'
            }}
        >
            {icon} {label}
        </button>
    );
}

function BreakdownItem({ label, value, color }: any) {
    return (
        <div style={{ backgroundColor: 'var(--bg-alt)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ width: '12px', height: '4px', backgroundColor: color, margin: '0 auto 0.5rem', borderRadius: '2px' }}></div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--foreground)' }}>GHS {value.toLocaleString()}</div>
        </div>
    );
}

