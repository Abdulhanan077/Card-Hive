"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaTrophy, FaCog, FaPlus, FaHistory, FaBolt, FaTrash } from 'react-icons/fa';
import { toast } from "react-hot-toast";

type LeaderboardEntry = {
    userId: number;
    username: string;
    monthlyValue: number;
    lifetimeValue: number;
    pointsEarned: number;
    rank: number;
};

type RewardConfig = {
    id: number;
    type: string;
    boardType: string;
    key: string;
    points: number;
    description: string;
    isActive: boolean;
};

export default function AdminLeaderboardPage() {
    const [data, setData] = useState<{ 
        topTraders: LeaderboardEntry[], 
        topReferrers: LeaderboardEntry[],
        speedKings: LeaderboardEntry[] 
    } | null>(null);
    const [configs, setConfigs] = useState<RewardConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'BOARDS' | 'CONFIG'>('BOARDS');

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch('/api/user/leaderboard');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/admin/leaderboard/reward-config');
            const result = await res.json();
            if (result.success) {
                setConfigs(result.data);
            }
        } catch (error) {
            console.error("Failed to fetch configs:", error);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
        fetchConfigs();
    }, []);

    const handleAdjustPoints = async (userId: number, username: string, boardType: string, amount?: number) => {
        let adjustment: number;
        if (amount !== undefined) {
            adjustment = amount;
        } else {
            const input = prompt(`Adjust points for @${username} on ${boardType}. Enter a positive number to add, negative to subtract:`);
            if (input === null) return;
            adjustment = parseFloat(input);
        }
        
        if (isNaN(adjustment)) {
            toast.error("Please enter a valid number.");
            return;
        }

        try {
            const res = await fetch('/api/admin/leaderboard/adjust', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, adjustment, boardType })
            });
            const result = await res.json();
            if (result.success) {
                toast.success(result.message);
                fetchLeaderboard();
            } else {
                toast.error("Error: " + result.message);
            }
        } catch (error) {
            toast.error("Failed to adjust points.");
        }
    };

    const handleUpdateConfig = async (config: RewardConfig) => {
        try {
            const res = await fetch('/api/admin/leaderboard/reward-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const result = await res.json();
            if (result.success) {
                toast.success("Configuration updated!");
                fetchConfigs();
                fetchLeaderboard();
            }
        } catch (error) {
            toast.error("Failed to update config");
        }
    };

    const handleDeleteConfig = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        try {
            const res = await fetch(`/api/admin/leaderboard/reward-config?id=${id}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
                toast.success("Config deleted");
                fetchConfigs();
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleDistribute = async (boardType: string, basePoints: number) => {
        if (!confirm(`Are you sure you want to distribute tiered rewards for the ${boardType} board now? This will update user wallets in real-time.`)) return;

        try {
            const res = await fetch('/api/admin/leaderboard/distribute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardType, basePoints })
            });
            const result = await res.json();
            if (result.success) {
                toast.success(`Successfully awarded points to ${result.awarded.length} users!`, { icon: '💰' });
                fetchLeaderboard();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Failed to distribute rewards.");
        }
    };

    const getBoardSetting = (board: string, key: string) => {
        return configs.find(c => c.boardType === board && c.key === key);
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

    const renderTable = (entries: LeaderboardEntry[], title: string, description: string, unit: string, boardType: string) => (
        <div className="card responsive-card">
            <style jsx>{`
                @media (max-width: 768px) {
                    .responsive-card {
                        padding: 1rem !important;
                    }
                }
            `}</style>
            <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginBottom: '0.2rem' }}>{title}</h3>
                <p style={{ fontSize: '0.75rem', opacity: 0.7 }}>{description}</p>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '0.5rem' }}>Rank</th>
                            <th style={{ padding: '0.5rem' }}>User</th>
                            <th style={{ padding: '0.5rem' }}>Lifetime</th>
                            <th style={{ padding: '0.5rem' }}>Monthly</th>
                            <th style={{ padding: '0.5rem' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.userId} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>
                                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                    <Link href={`/admin/users?q=${entry.username}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                        @{entry.username}
                                    </Link>
                                </td>
                                <td style={{ padding: '0.5rem', opacity: 0.6 }}>
                                    {unit === '₵' ? `₵${entry.lifetimeValue.toLocaleString()}` : `${entry.lifetimeValue}`}
                                </td>
                                <td style={{ padding: '0.5rem', fontWeight: 600 }}>
                                    {unit === '₵' ? `₵${entry.monthlyValue.toLocaleString()}` : `${entry.monthlyValue}`}
                                </td>
                                <td style={{ padding: '0.5rem', color: 'var(--primary)', fontWeight: 900 }}>
                                    {entry.pointsEarned.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="dashboard-main-container" style={{ padding: 'var(--mobile-padding, 2rem)' }}>
            <style jsx>{`
                @media (max-width: 768px) {
                    .dashboard-main-container {
                        padding: 1rem !important;
                    }
                    .leaderboard-header {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 1rem !important;
                    }
                    .tab-group {
                        width: 100% !important;
                        justify-content: flex-start !important;
                    }
                    .tab-group button {
                        flex: 1;
                    }
                }
            `}</style>
            <div className="leaderboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Card Hive Champions</h1>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Point-based competition</p>
                </div>
                <div className="tab-group" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={activeTab === 'BOARDS' ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '0.6rem 1.25rem' }} onClick={() => setActiveTab('BOARDS')}>Boards</button>
                    <button className={activeTab === 'CONFIG' ? 'btn btn-primary' : 'btn btn-outline'} style={{ padding: '0.6rem 1.25rem' }} onClick={() => setActiveTab('CONFIG')}>Config</button>
                </div>
            </div>

            {activeTab === 'BOARDS' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {renderTable(data?.topTraders || [], "Whale Board", "Top traders by volume (₵)", "₵", "WHALE")}
                    {renderTable(data?.speedKings || [], "Speed Kings", "Top traders by number of trades", "trades", "SPEED")}
                    {renderTable(data?.topReferrers || [], "Referrals", "Top referrers by new registrations", "referrals", "REFERRAL")}
                </div>
            ) : (
                <div className="card">
                    <h3 style={{ marginBottom: '1.5rem' }}>Reward Configuration</h3>
                    
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', opacity: 0.7, fontSize: '0.85rem' }}>
                                    <th style={{ padding: '1rem' }}>Board</th>
                                    <th style={{ padding: '1rem' }}>Leader's Progress (Target)</th>
                                    <th style={{ padding: '1rem' }}>Base Points (P)</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { id: 'WHALE', name: 'Whale Board', leaderValue: data?.topTraders?.[0]?.monthlyValue || 0, unit: '₵', defaultPoints: 150 },
                                    { id: 'SPEED', name: 'Speed Kings', leaderValue: data?.speedKings?.[0]?.monthlyValue || 0, unit: 'trades', defaultPoints: 100 },
                                    { id: 'REFERRAL', name: 'Referrals Hub', leaderValue: data?.topReferrers?.[0]?.monthlyValue || 0, unit: 'referrals', defaultPoints: 100 }
                                ].map((board) => {
                                    const pointsCfg = getBoardSetting(board.id, 'BASE_POINTS');
                                    
                                    return (
                                        <tr key={board.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 700 }}>{board.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                                    Leader: {board.unit === '₵' ? `₵${board.leaderValue.toLocaleString()}` : `${board.leaderValue} ${board.unit}`}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input 
                                                        type="number"
                                                        defaultValue={pointsCfg?.points || board.defaultPoints}
                                                        onBlur={(e) => handleUpdateConfig({
                                                            id: pointsCfg?.id || 0,
                                                            type: 'BOARD_SETTING',
                                                            boardType: board.id,
                                                            key: 'BASE_POINTS',
                                                            points: parseFloat(e.target.value),
                                                            description: `${board.name} base reward points`,
                                                            isActive: true
                                                        })}
                                                        style={{ width: '80px', padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                                    />
                                                    <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>pts</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button 
                                                    className="btn btn-primary"
                                                    onClick={() => handleDistribute(board.id, pointsCfg?.points || board.defaultPoints)}
                                                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                                                >
                                                    Confirm
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-alt)', borderRadius: '10px', fontSize: '0.85rem' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Points Distribution Rules (Tiered):</h4>
                        <ul style={{ paddingLeft: '1.2rem', opacity: 0.8 }}>
                            <li><strong>Rank 1:</strong> Full Base Points (P)</li>
                            <li><strong>Rank 2:</strong> P - 5 points</li>
                            <li><strong>Rank 3:</strong> P - 10 points</li>
                            <li><strong>Rank 4-10:</strong> P - 15 points</li>
                            <li>Minimum award is always <strong>10 points</strong>.</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
