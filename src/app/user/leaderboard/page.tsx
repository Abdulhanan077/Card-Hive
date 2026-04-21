"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaCrown, FaUserFriends, FaBolt, FaShareAlt, FaWhatsapp } from 'react-icons/fa';
import { maskUsername } from "@/lib/utils/masking";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

type LeaderboardEntry = {
    userId: number;
    username: string;
    monthlyValue: number;
    lifetimeValue: number;
    pointsEarned: number;
    rank: number;
};

export default function LeaderboardPage() {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'volume' | 'referrals' | 'speed'>('volume');
    const [data, setData] = useState<{ 
        topTraders: LeaderboardEntry[], 
        topReferrers: LeaderboardEntry[], 
        speedKings: LeaderboardEntry[],
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [referralsList, setReferralsList] = useState<any[]>([]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/user/leaderboard');
                const result = await res.json();
                if (result.success) {
                    setData(result.data);
                }

                const statsRes = await fetch('/api/user/referral-stats');
                const statsResult = await statsRes.json();
                if (statsResult.success) {
                    setUserData(statsResult.userData);
                    setReferralsList(statsResult.referralsList || []);
                }
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const handleShare = (entry: LeaderboardEntry) => {
        const referralLink = userData?.referralCode 
            ? `${window.location.origin}/register?ref=${userData.referralCode}` 
            : window.location.origin;
        
        const boardName = activeTab === 'volume' ? 'Whale Board' : 'Speed Kings';
        const unit = activeTab === 'volume' ? `₵${entry.monthlyValue.toLocaleString()}` : `${entry.monthlyValue} trades`;
        
        const text = `🚀 I'm ranked #${entry.rank} on MyCardHive's ${boardName} with ${unit}! 🔥 Join me and start trading at: ${referralLink}`;
        
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        
        toast.success("Opening WhatsApp share...", {
            icon: '📱',
            style: {
                borderRadius: '10px',
                background: '#25D366',
                color: '#fff',
            },
        });

        window.open(url, '_blank', 'noreferrer');
    };

    const CurrentRankings = activeTab === 'volume' 
        ? data?.topTraders 
        : activeTab === 'speed' 
            ? data?.speedKings 
            : data?.topReferrers;

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Card-Hive Champions...</div>;

    const renderTableHeader = () => {
        if (activeTab === 'referrals') {
            return (
                <thead>
                    <tr>
                        <th className="text-left">USER</th>
                        <th className="text-right">JOINED</th>
                        <th className="text-right">POINTS</th>
                        <th className="text-right">STATUS</th>
                    </tr>
                </thead>
            );
        }
        return (
            <thead>
                <tr>
                    <th className="text-left">RANK / USER</th>
                    <th className="text-right">LIFETIME</th>
                    <th className="text-right">MONTHLY</th>
                    <th className="text-right">POINTS</th>
                </tr>
            </thead>
        );
    };

    return (
        <div className="leaderboard-container">
            <div className="dashboard-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 className="dashboard-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>MyCardHive Champions</h1>
                <p className="dashboard-subtitle" style={{ fontSize: '1.1rem', opacity: 0.8 }}>Earn points based on monthly performance. Lifetime glory remains!</p>
            </div>

            <div className="tabs-container">
                <button 
                    className={`tab-btn ${activeTab === 'volume' ? 'active' : ''}`}
                    onClick={() => setActiveTab('volume')}
                >
                    <FaCrown /> Whale Board
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'speed' ? 'active' : ''}`}
                    onClick={() => setActiveTab('speed')}
                >
                    <FaBolt /> Speed Kings
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('referrals')}
                >
                    <FaUserFriends /> Referrals
                </button>
            </div>

            <div className="ranking-table card">
                <div className="table-description">
                    {activeTab === 'volume' ? "Top traders ranked by their total monthly trading volume (GHS)." : 
                     activeTab === 'speed' ? "Fastest traders ranked by the total number of trades completed this month." : 
                     "Top referrers ranked by the points earned from active invited members."}
                </div>
                <div className="table-responsive">
                    <table className="leaderboard-table">
                        <colgroup>
                            <col style={{ width: '30%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '30%' }} />
                        </colgroup>
                        {renderTableHeader()}
                        <tbody>
                            {activeTab === 'referrals' ? (
                                referralsList.length > 0 ? (
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
                                                +{ref.pointsEarned}
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
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="empty-cell">You haven't referred anyone yet.</td>
                                    </tr>
                                )
                            ) : CurrentRankings && CurrentRankings.length > 0 ? (
                                CurrentRankings.map((entry, index) => (
                                    <tr key={entry.userId} className={`rank-row-tr ${entry.rank === 1 ? 'gold-bg' : ''}`}>
                                        <td>
                                            <div className="user-info">
                                                <span className="rank-badge">
                                                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                                </span>
                                                <span className="username">@{maskUsername(entry.username)}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            {activeTab === 'volume' ? `₵${(entry.lifetimeValue/1000).toFixed(1)}k` : entry.lifetimeValue}
                                        </td>
                                        <td className="text-right bold">
                                            {activeTab === 'volume' ? `₵${entry.monthlyValue.toLocaleString()}` : entry.monthlyValue}
                                        </td>
                                        <td className="text-right highlight">
                                            {entry.pointsEarned}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="empty-cell">No records found for this period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {(() => {
                const myEntry = CurrentRankings?.find(e => e.userId === parseInt(session?.user?.id || '0'));
                if (!myEntry) return null;

                return (
                    <div className="growth-loop-card">
                        <div className="growth-loop-content">
                            <div className="growth-loop-text">
                                <h3 className="growth-loop-title">
                                    <FaCrown /> You're on the Board!
                                </h3>
                                <p className="growth-loop-desc">
                                    Congratulations @{session?.user?.username}! You are ranked <strong>#{myEntry.rank}</strong> this month.
                                </p>
                            </div>
                            <button 
                                onClick={() => handleShare(myEntry)}
                                className="share-btn"
                            >
                                <FaWhatsapp /> Brag on WhatsApp
                            </button>
                        </div>
                    </div>
                );
            })()}

            <style jsx>{`
                .leaderboard-container {
                    padding: 1.5rem 1rem 4rem;
                    max-width: 1100px;
                    margin: 0 auto;
                }
                .dashboard-title {
                    background: linear-gradient(135deg, var(--foreground) 0%, var(--primary) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-top: 1rem;
                }
                .tabs-container {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 2rem;
                    background: var(--bg-alt);
                    padding: 0.4rem;
                    border-radius: 12px;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
                }
                .tab-btn {
                    flex: 1;
                    padding: 0.85rem;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.6rem;
                    transition: all 0.2s ease;
                    border-radius: 8px;
                    font-size: 0.95rem;
                }
                .tab-btn:hover {
                    color: var(--primary);
                    background: rgba(var(--primary-rgb), 0.05);
                }
                .tab-btn.active {
                    background: var(--primary);
                    color: white;
                    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.25);
                }
                .ranking-table {
                    background: var(--surface);
                    border-radius: 16px;
                    border: 1px solid var(--border);
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
                    overflow: hidden;
                }
                .table-description {
                    padding: 1.25rem 1.5rem 0.5rem;
                    font-size: 0.9rem;
                    color: var(--text-muted);
                    font-weight: 500;
                    line-height: 1.5;
                    border-bottom: 1px solid var(--border);
                    background: rgba(var(--primary-rgb), 0.02);
                }
                .table-responsive {
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .leaderboard-table {
                    display: table !important;
                    width: 100% !important;
                    min-width: 650px;
                    border-collapse: collapse !important;
                    text-align: left;
                    table-layout: fixed !important;
                    border: 1px solid var(--border);
                }
                .leaderboard-table thead { display: table-header-group !important; }
                .leaderboard-table tbody { display: table-row-group !important; }
                .leaderboard-table tr { display: table-row !important; }
                .leaderboard-table th, .leaderboard-table td {
                    display: table-cell !important;
                    padding: 1rem 0.75rem !important;
                    vertical-align: middle;
                    border: 1px solid var(--border);
                    box-sizing: border-box !important;
                    overflow: hidden;
                }
                .leaderboard-table th {
                    background: var(--bg-alt);
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                }
                /* Explicit Column Widths */
                .leaderboard-table th:nth-child(1), .leaderboard-table td:nth-child(1) { width: 30% !important; }
                .leaderboard-table th:nth-child(2), .leaderboard-table td:nth-child(2) { width: 20% !important; }
                .leaderboard-table th:nth-child(3), .leaderboard-table td:nth-child(3) { width: 20% !important; }
                .leaderboard-table th:nth-child(4), .leaderboard-table td:nth-child(4) { width: 30% !important; }
                .rank-row-tr:last-child td {
                    border-bottom: none;
                }
                .rank-row-tr:hover td {
                    background: var(--bg-alt);
                }
                .gold-bg td {
                    background: rgba(255, 215, 0, 0.03);
                }
                
                .text-right { text-align: right; }
                .text-left { text-align: left; }
                .bold { font-weight: 700; }
                
                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    min-width: 0;
                }
                .username {
                    font-weight: 700;
                    color: var(--foreground);
                    white-space: nowrap;
                }
                .rank-badge {
                    font-weight: 800;
                    font-size: 1.1rem;
                    width: 32px;
                    flex-shrink: 0;
                }
                
                .date-cell {
                    opacity: 0.6;
                    font-size: 0.85rem;
                }
                .highlight {
                    color: var(--primary);
                    font-weight: 900;
                    font-size: 1.1rem;
                }
                
                .status-badges {
                    display: flex;
                    gap: 0.4rem;
                    justify-content: flex-end;
                    flex-wrap: wrap;
                }
                .badge-blocked {
                    font-size: 0.6rem;
                    background: var(--danger);
                    color: white;
                    padding: 0.15rem 0.4rem;
                    border-radius: 4px;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .badge-active {
                    padding: 0.3rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    white-space: nowrap;
                }
                .qualified { background: var(--success-light); color: var(--success); }
                .pending { background: var(--bg-alt); color: var(--text-muted); }
                
                .empty-cell {
                    padding: 4rem 2rem;
                    text-align: center;
                    color: var(--text-muted);
                    font-style: italic;
                }

                @media (max-width: 768px) {
                    .dashboard-title { font-size: 2rem !important; }
                }

                @media (max-width: 500px) {
                    .leaderboard-container { padding: 1rem 0.5rem; }
                    .tab-btn span { display: none; }
                    .tab-btn { padding: 0.75rem 0.5rem; }
                }

                .growth-loop-card {
                    margin-top: 2.5rem;
                    background: linear-gradient(135deg, var(--primary) 0%, #6e8efb 100%);
                    color: white;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(var(--primary-rgb), 0.2);
                    padding: 2rem;
                }
                .growth-loop-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1.5rem;
                }
                .growth-loop-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                    font-size: 1.5rem;
                    font-weight: 800;
                }
                .growth-loop-desc {
                    opacity: 0.95;
                    font-size: 1rem;
                    margin: 0;
                }
                .share-btn {
                    padding: 1rem 1.75rem;
                    border-radius: 12px;
                    border: none;
                    background: white;
                    color: var(--primary);
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
                    transition: all 0.2s ease;
                    font-size: 0.9rem;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .share-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(0,0,0,0.2);
                }

                @media (max-width: 650px) {
                    .growth-loop-content {
                        flex-direction: column;
                        text-align: center;
                    }
                    .growth-loop-title { justify-content: center; }
                    .share-btn { width: 100%; justify-content: center; }
                }
            `}</style>
        </div>
    );
}

