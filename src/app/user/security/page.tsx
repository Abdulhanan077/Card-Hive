import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SecurityClient from "./SecurityClient";
import { cookies } from "next/headers";

export default async function SecurityDashboard() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const userId = parseInt(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            lastLoginAt: true,
            lastIp: true,
            lastDevice: true,
            sessions: {
                orderBy: { lastActive: "desc" }
            }
        }
    });

    if (!user) return <div>User not found</div>;

    const cookieStore = await cookies();
    const currentToken = cookieStore.get("next-auth.session-token")?.value ||
        cookieStore.get("__Secure-next-auth.session-token")?.value;

    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem" }}>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Security & Active Sessions</h1>
                <p className="dashboard-subtitle">Monitor where you are logged in and protect your account.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="card">
                    <h3 style={{ marginBottom: "1rem", color: "var(--primary)" }}>Account Status</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div>
                            <small style={{ opacity: 0.7 }}>Last Login</small>
                            <div style={{ fontWeight: 600 }}>
                                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                            </div>
                        </div>
                        <div>
                            <small style={{ opacity: 0.7 }}>Login Device</small>
                            <div style={{ fontWeight: 600 }}>{user.lastDevice || "Unknown"}</div>
                        </div>
                        <div>
                            <small style={{ opacity: 0.7 }}>Last IP Address</small>
                            <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{user.lastIp || "Unknown"}</div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ backgroundColor: "var(--bg-alt)", border: "1px dashed var(--border)" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Login Protection</h3>
                    <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                        If you notice any suspicious activity, we recommend logging out of all other sessions immediately and changing your password.
                    </p>
                    <div style={{ marginTop: "1rem" }}>
                        <Link href="/user/settings" className="btn btn-secondary" style={{ width: "100%", textAlign: "center", textDecoration: "none", display: "block" }}>
                            Change Password
                        </Link>
                    </div>
                </div>
            </div>

            <SecurityClient sessions={user.sessions as any} currentToken={currentToken || ""} />
        </div>
    );
}

// Link helper for Change Password
import Link from "next/link";
