import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function AdminRewardsQueue() {
    const redemptions = await prisma.rewardRedemption.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" }
    });

    async function processRedemptionAction(formData: FormData) {
        "use server";
        const id = parseInt(formData.get("id") as string);
        const status = formData.get("status") as string; // "PAID" | "REJECTED"

        const req = await prisma.rewardRedemption.findUnique({ where: { id } });
        if (!req || req.status !== "PENDING") return;

        if (status === "REJECTED") {
            // Refund points
            await prisma.$transaction([
                prisma.rewardRedemption.update({
                    where: { id },
                    data: { status }
                }),
                prisma.user.update({
                    where: { id: req.userId },
                    data: { rewardBalance: { increment: req.pointsRedeemed } }
                })
            ]);
        } else {
            // Just mark paid
            await prisma.rewardRedemption.update({
                where: { id },
                data: { status: "PAID" }
            });
        }

        revalidatePath("/admin/rewards");
        revalidatePath("/user/rewards");
    }

    return (
        <>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Reward Redemptions Queue</h1>
                <p className="dashboard-subtitle">Process user requests to withdraw their accumulated referral and trade points.</p>
            </div>

            <div className="table-container" style={{ marginTop: '2rem' }}>
                {redemptions.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                        No redemption requests found.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Points Redeemed</th>
                                <th>Payout Method</th>
                                <th>Payout Details</th>
                                <th>Status</th>
                                <th>Date Requested</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {redemptions.map((req) => (
                                <tr key={req.id}>
                                    <td style={{ fontWeight: 600 }}>@{req.user.username}</td>
                                    <td>
                                        <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{req.pointsRedeemed} pts</span>
                                    </td>
                                    <td>{req.payoutMethod}</td>
                                    <td style={{ maxWidth: '200px', wordBreak: 'break-all' }}>{req.payoutDetails}</td>
                                    <td>
                                        <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                                    </td>
                                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        {req.status === "PENDING" ? (
                                            <form action={processRedemptionAction} style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input type="hidden" name="id" value={req.id} />
                                                <button type="submit" name="status" value="PAID" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Pay</button>
                                                <button type="submit" name="status" value="REJECTED" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', backgroundColor: '#fef2f2', color: 'var(--danger)', border: '1px solid currentColor' }}>Reject</button>
                                            </form>
                                        ) : (
                                            <span style={{ opacity: 0.5 }}>Processed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
