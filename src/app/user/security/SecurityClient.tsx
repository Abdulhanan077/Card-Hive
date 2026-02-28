"use client";

import { useState } from "react";
import { logoutSession, logoutOtherSessions } from "../../actions/security";

interface Session {
    id: string;
    sessionToken: string;
    expires: Date;
    ipAddress: string | null;
    userAgent: string | null;
    deviceInfo: string | null;
    lastActive: Date;
}

export default function SecurityClient({
    sessions,
    currentToken
}: {
    sessions: Session[];
    currentToken: string
}) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleLogout = async (token: string) => {
        if (!confirm("Are you sure you want to log out of this session?")) return;
        setLoading(token);
        try {
            await logoutSession(token);
        } catch (err) {
            alert("Failed to logout session");
        } finally {
            setLoading(null);
        }
    };

    const handleLogoutAllOther = async () => {
        if (!confirm("This will log you out of ALL other devices. Continue?")) return;
        setLoading("all");
        try {
            await logoutOtherSessions();
        } catch (err) {
            alert("Failed to logout other sessions");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: 0 }}>Active Sessions</h3>
                {sessions.length > 1 && (
                    <button
                        onClick={handleLogoutAllOther}
                        disabled={!!loading}
                        className="btn btn-secondary"
                        style={{ color: "var(--danger)", borderColor: "currentColor", fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                    >
                        {loading === "all" ? "Logging out..." : "Logout All Others"}
                    </button>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {sessions.map((session) => {
                    const isCurrent = session.sessionToken === currentToken;
                    return (
                        <div
                            key={session.id}
                            style={{
                                padding: "1rem",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--border)",
                                backgroundColor: isCurrent ? "rgba(14, 165, 233, 0.05)" : "transparent",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                                <div style={{ fontSize: "1.5rem" }}>
                                    {session.deviceInfo?.toLowerCase().includes("mobile") ? "📱" : "💻"}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        {session.deviceInfo || "Unknown Device"}
                                        {isCurrent && <span className="badge badge-paid" style={{ fontSize: "0.6rem" }}>THIS DEVICE</span>}
                                    </div>
                                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                                        IP: {session.ipAddress || "Unknown"} • Last active: {new Date(session.lastActive).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {!isCurrent && (
                                <button
                                    onClick={() => handleLogout(session.sessionToken)}
                                    disabled={!!loading}
                                    className="btn btn-secondary"
                                    style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                                >
                                    {loading === session.sessionToken ? "..." : "Logout"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
