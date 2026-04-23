"use client";

import { useState } from "react";
import { updateUserRewardPoints, updateUserVipTrades, updateUserStatus, adminDeleteUser } from "@/app/actions/admin-users";
import { useNotification } from "@/context/NotificationContext";

interface Props {
    userId: number;
    username: string;
    status: string;
    completedTradesCount: number;
}

export default function UserActionPanelControls({ userId, username, status, completedTradesCount }: Props) {
    const { showNotification } = useNotification();
    const [rewardPoints, setRewardPoints] = useState<string>("");
    const [vipPoints, setVipPoints] = useState<number>(completedTradesCount);
    const [loading, setLoading] = useState<string | null>(null);

    const handlePointsAction = async (action: "add" | "deduct") => {
        const amount = parseFloat(rewardPoints);
        if (isNaN(amount) || amount <= 0) {
            showNotification('ERROR', "Please enter a valid points amount.");
            return;
        }

        setLoading(action);
        try {
            await updateUserRewardPoints(userId, amount, action);
            showNotification('SUCCESS', `Successfully ${action === 'add' ? 'rewarded' : 'deducted'} ${amount} points for @${username}`);
            setRewardPoints("");
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to update points");
        } finally {
            setLoading(null);
        }
    };

    const handleUpdateVip = async () => {
        setLoading("vip");
        try {
            await updateUserVipTrades(userId, vipPoints);
            showNotification('SUCCESS', `Successfully updated VIP trades for @${username}`);
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to update VIP trades");
        } finally {
            setLoading(null);
        }
    };

    const handleStatusToggle = async () => {
        const newStatus = status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        setLoading("status");
        try {
            await updateUserStatus(userId, newStatus);
            showNotification('SUCCESS', `Account @${username} is now ${newStatus}`);
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to update status");
        } finally {
            setLoading(null);
        }
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const handleDeleteAccount = async () => {
        if (!showDeleteConfirm) {
            setShowDeleteConfirm(true);
            return;
        }

        setLoading("delete");
        try {
            await adminDeleteUser(userId);
            showNotification('SUCCESS', `Account @${username} has been permanently deleted.`);
        } catch (err: any) {
            showNotification('ERROR', err.message || "Failed to delete account");
            setShowDeleteConfirm(false);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Modify Reward Pts */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-alt)', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{ fontSize: "0.85rem", color: 'var(--warning)', fontWeight: 600 }}>Modify Reward Pts</label>
                <input 
                    type="number" 
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                    placeholder="Amount (e.g. 50)" 
                    min="1" 
                    step="any" 
                    className="form-input" 
                    style={{ 
                        marginBottom: '0.75rem', 
                        color: 'var(--text)', 
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        border: '1px solid var(--border)' 
                    }} 
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => handlePointsAction("add")}
                        disabled={!!loading}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '0.5rem' }}
                    >
                        {loading === "add" ? "..." : "Reward"}
                    </button>
                    <button 
                        onClick={() => handlePointsAction("deduct")}
                        disabled={!!loading}
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '0.5rem', color: 'var(--danger)', border: '1px solid currentColor' }}
                    >
                        {loading === "deduct" ? "..." : "Deduct"}
                    </button>
                </div>
            </div>

            {/* Set VIP Pts */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <label className="form-label" style={{ fontSize: "0.85rem", color: 'var(--info)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Set VIP Pts (Trades Count)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                        type="number" 
                        value={vipPoints}
                        onChange={(e) => setVipPoints(parseInt(e.target.value) || 0)}
                        placeholder="New Count" 
                        min="0" 
                        className="form-input" 
                        style={{ 
                            marginBottom: 0, 
                            width: '100%', 
                            color: 'var(--text)', 
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            border: '1px solid var(--border)' 
                        }} 
                    />
                    <button 
                        onClick={handleUpdateVip}
                        disabled={!!loading}
                        className="btn btn-primary" 
                        style={{ padding: '0.6rem 1.25rem', height: '100%', minHeight: '42px' }}
                    >
                        {loading === "vip" ? "..." : "Set"}
                    </button>
                </div>
            </div>

            {/* Status Toggle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                    onClick={handleStatusToggle}
                    disabled={!!loading}
                    className={status === 'ACTIVE' ? "btn btn-secondary" : "btn btn-primary"}
                    style={status === 'ACTIVE' ? { width: '100%', color: 'var(--danger)', border: '1px solid currentColor' } : { width: '100%', backgroundColor: 'var(--success)', color: 'white' }}
                >
                    {loading === "status" ? "..." : (status === 'ACTIVE' ? "Block Account" : "Activate Account")}
                </button>

                <button 
                    onClick={handleDeleteAccount}
                    disabled={!!loading}
                    className="btn btn-danger"
                    style={{ 
                        width: '100%', 
                        backgroundColor: showDeleteConfirm ? '#dc2626' : 'transparent',
                        color: showDeleteConfirm ? 'white' : '#dc2626',
                        border: '1px solid #dc2626'
                    }}
                >
                    {loading === "delete" ? "..." : (showDeleteConfirm ? "Confirm Delete?" : "Delete Account")}
                </button>
                
                {showDeleteConfirm && (
                    <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn"
                        style={{ width: '100%', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                    >
                        Cancel Deletion
                    </button>
                )}
            </div>
        </div>
    );
}
