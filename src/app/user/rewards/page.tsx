import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClientRedeemForm from "./ClientRedeemForm";

export default async function UserRewardsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return redirect("/login");

    const userId = parseInt(session.user.id);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { rewardBalance: true, completedTradesCount: true }
    });

    const pendingRequests = await prisma.rewardRedemption.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" }
    });

    let settings = null;
    try {
        settings = await prisma.settings.findFirst();
    } catch (e) {
        console.error("User Rewards: Could not fetch settings", e);
    }

    const cediEquivalent = (((user?.rewardBalance || 0) / 100) * (settings?.rewardPointsToGhs || 100)).toFixed(2);

    return (
        <>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Redeem Rewards</h1>
                <p className="dashboard-subtitle">Request a withdrawal for your accumulated reward points.</p>
            </div>

            <div className="responsive-grid" style={{ marginTop: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>Current Balance</h3>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--warning)', marginTop: '1rem', marginBottom: '0.2rem' }}>
                        {user?.rewardBalance || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>pts</span>
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--success)', fontWeight: 600, marginBottom: '1.5rem' }}>
                        ≈ GHS {cediEquivalent}
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-alt)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Withdrawal Requirements:
                        </div>
                        <ul style={{ paddingLeft: '1.2rem', marginBottom: 0 }}>
                            <li style={{ color: (user?.rewardBalance || 0) >= 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                                Minimum 100 Reward Points
                            </li>
                            <li style={{ color: (user?.completedTradesCount || 0) >= 5 ? 'var(--success)' : 'var(--text-muted)' }}>
                                At least 5 Successful Trades ({user?.completedTradesCount || 0}/5)
                            </li>
                        </ul>
                    </div>

                    <ClientRedeemForm
                        currentBalance={user?.rewardBalance || 0}
                        completedTradesCount={user?.completedTradesCount || 0}
                    />
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: "1rem" }}>Redemption History</h3>
                    {pendingRequests.length === 0 ? (
                        <p style={{ opacity: 0.7 }}>You have not made any redemption requests yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pendingRequests.map(req => (
                                <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-alt)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontWeight: 600 }}>{req.pointsRedeemed} pts</span>
                                        <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                        Method: {req.payoutMethod}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.5rem' }}>
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
