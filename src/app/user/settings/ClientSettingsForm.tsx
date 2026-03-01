"use client";

import { useState } from "react";
import ReferralLinkCopy from "@/components/ReferralLinkCopy"; // Might not directly use it, but keeping it in mind, we'll just display code for now

type SettingsUser = {
    username: string;
    email: string;
    memberSince: string;
    referralCode: string;
    emailNotificationsEnabled: boolean;
};

import { updateEmailPreferences } from "@/app/actions/userSettings";
import { useNotification } from "@/context/NotificationContext";

export default function ClientSettingsForm({ user }: { user: SettingsUser }) {
    const { showNotification } = useNotification();
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);
    const [updatingPrefs, setUpdatingPrefs] = useState(false);

    // Form States
    const [fullName, setFullName] = useState(user.username);
    const [email, setEmail] = useState(user.email);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [emailNotifications, setEmailNotifications] = useState(user.emailNotificationsEnabled);

    const handleToggleEmailNotifications = async () => {
        setUpdatingPrefs(true);
        const newValue = !emailNotifications;
        setEmailNotifications(newValue); // Optimistic UI
        const res = await updateEmailPreferences(newValue);
        if (!res.success) {
            setEmailNotifications(!newValue); // Revert on failure
            showNotification('ERROR', res.error || "Failed to update preferences");
        } else {
            showNotification('SUCCESS', `Email notifications ${newValue ? 'enabled' : 'disabled'}`);
        }
        setUpdatingPrefs(false);
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingInfo(true);
        // Simulate API delay for demo
        setTimeout(() => {
            showNotification('SUCCESS', "Profile information updated successfully!");
            setLoadingInfo(false);
        }, 1000);
    };

    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingPassword(true);
        // Simulate API delay for demo
        setTimeout(() => {
            showNotification('SUCCESS', "Password updated successfully!");
            setLoadingPassword(false);
            setCurrentPassword("");
            setNewPassword("");
        }, 1000);
    };

    // Avatar Initial
    const avatarLetter = user.username.charAt(0).toUpperCase();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Top Profile Header Card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem' }}>
                <div style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: '#1d4ed8', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '3rem', fontWeight: 'bold'
                }}>
                    {avatarLetter}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{user.username}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'gray', fontSize: '0.9rem' }}>
                        <span>✉️</span> {user.email}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <span style={{ backgroundColor: '#10b981', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            ✓ Email Verified
                        </span>
                        <span style={{ backgroundColor: '#6b7280', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            ⛨ Identity Unverified
                        </span>
                    </div>

                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'gray' }}>
                        Referral Code: <span style={{ color: '#db2777', fontWeight: 'bold', marginLeft: '0.25rem' }}>{user.referralCode}</span>
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <span style={{ fontWeight: 'bold' }}>{user.username}</span>
                        <span style={{ fontSize: '0.8rem', color: 'gray' }}>View Profile</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

                {/* Left Column: Forms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Profile Information */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>👤</span> Profile Information
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'gray', marginBottom: '1.5rem' }}>
                            Update your account's profile information and email address.
                        </p>

                        <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'gray', fontSize: '0.85rem' }}>
                                    <span>👤</span> Full Name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'gray', fontSize: '0.85rem' }}>
                                    <span>✉️</span> Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#6366f1', display: 'flex', gap: '0.5rem', alignItems: 'center' }} disabled={loadingInfo}>
                                    <span>💾</span> {loadingInfo ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" className="btn" style={{ color: 'gray', background: 'transparent' }} onClick={() => { setFullName(user.username); setEmail(user.email); }}>
                                    <span>⊗</span> Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Update Password */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🔒</span> Update Password
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'gray', marginBottom: '1.5rem' }}>
                            Ensure your account is using a long, random password to stay secure.
                        </p>

                        <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'gray', fontSize: '0.85rem' }}>
                                    <span>🔓</span> Current Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter your current password"
                                        required
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'gray', cursor: 'pointer' }}>👁️</span>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'gray', fontSize: '0.85rem' }}>
                                    <span>🗝️</span> New Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter your new password"
                                        required
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'gray', cursor: 'pointer' }}>👁️</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#6366f1', display: 'flex', gap: '0.5rem', alignItems: 'center' }} disabled={loadingPassword}>
                                    <span>💾</span> {loadingPassword ? "Updating..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Notification Preferences */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>🔔</span> Notification Preferences
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'gray', marginBottom: '1.5rem' }}>
                            Choose what kind of updates you receive from us.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Trade Updates</h4>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'gray', marginTop: '0.25rem' }}>Receive email notifications when your trade status changes or payment is sent.</p>
                            </div>
                            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '26px' }}>
                                <input
                                    type="checkbox"
                                    checked={emailNotifications}
                                    onChange={handleToggleEmailNotifications}
                                    disabled={updatingPrefs}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span style={{
                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: emailNotifications ? '#10b981' : '#ccc',
                                    transition: '.4s', borderRadius: '34px',
                                    opacity: updatingPrefs ? 0.6 : 1
                                }}>
                                    <span style={{
                                        position: 'absolute', content: '""', height: '18px', width: '18px',
                                        left: emailNotifications ? '28px' : '4px', bottom: '4px',
                                        backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                                    }} />
                                </span>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Right Column: Sidebar Panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Account Overview */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>Account Overview</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'gray' }}>Member Since</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user.memberSince}</span>
                                </div>
                                <span style={{ color: '#3b82f6', fontSize: '1.2rem' }}>📅</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'gray' }}>Email Status</span>
                                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#10b981' }}>Verified</span>
                                </div>
                                <span style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✓</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'gray' }}>Referral Code</span>
                                    <span style={{ color: '#db2777', fontWeight: 'bold', fontSize: '0.9rem' }}>{user.referralCode}</span>
                                </div>
                                <span style={{ color: '#3b82f6', fontSize: '1.2rem' }}>🏷️</span>
                            </div>
                        </div>
                    </div>

                    {/* Security Tips */}
                    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f9fafb' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1f2937' }}>
                            <span style={{ color: '#3b82f6' }}>🛡️</span> Security Tips
                        </h4>

                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#4b5563' }}>
                            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#10b981' }}>✓</span> Use a strong, unique password
                            </li>
                            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#10b981' }}>✓</span> Keep your email verified
                            </li>
                            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#10b981' }}>✓</span> Never share your password
                            </li>
                            <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <span style={{ color: '#10b981' }}>✓</span> Log out on shared devices
                            </li>
                        </ul>
                    </div>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 800px) {
                    .card {
                        flex-direction: column;
                        align-items: flex-start !important;
                    }
                    div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}} />
        </div>
    );
}
