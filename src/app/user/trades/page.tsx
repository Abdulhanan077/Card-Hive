import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import ConfirmReceiptButton from "@/app/components/ConfirmReceiptButton";

type TradeWithCount = Prisma.TradeGetPayload<{
    include: {
        _count: { select: { messages: true } }
    }
}>;

export default async function UserTradesPage(props: {
    searchParams: Promise<{ status?: string }>
}) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const userId = parseInt(session.user.id);
    const statusFilter = searchParams.status;

    const whereClause: any = { userId };
    if (statusFilter && ["PENDING", "UNDER_REVIEW", "PAID", "COMPLETED", "REJECTED"].includes(statusFilter)) {
        whereClause.status = statusFilter;
    }

    const trades = await prisma.trade.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { messages: true }
            }
        }
    });

    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ alignItems: 'flex-start' }}>
                <h1 className="dashboard-title">My Trades</h1>
                <p className="dashboard-subtitle">Track the status of all your submitted gift cards.</p>
            </div>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Link
                    href="/user/trades"
                    className={`btn ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}
                >All</Link>
                <Link
                    href="/user/trades?status=PENDING"
                    className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                >Pending</Link>
                <Link
                    href="/user/trades?status=PAID"
                    className={`btn ${statusFilter === 'PAID' ? 'btn-primary' : 'btn-secondary'}`}
                >Paid (Action Required)</Link>
                <Link
                    href="/user/trades?status=COMPLETED"
                    className={`btn ${statusFilter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}
                >Completed</Link>
                <Link
                    href="/user/trades?status=REJECTED"
                    className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
                >Rejected</Link>
            </div>

            <div className="table-container">
                {trades.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                        No trades found matching this status.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Trade ID</th>
                                <th>Submitted On</th>
                                <th>Brand</th>
                                <th>Value</th>
                                <th>Payout</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((trade) => (
                                <tr key={trade.id} style={{ cursor: "pointer" }}>
                                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>
                                        <Link href={`/user/trades/${trade.tradeId}`} style={{ textDecoration: "none" }}>
                                            {trade.tradeId}
                                        </Link>
                                        {trade._count.messages > 0 && (
                                            <span style={{ marginLeft: "6px", fontSize: "0.75rem", padding: "2px 6px", backgroundColor: "var(--primary)", color: "white", borderRadius: "10px" }}>
                                                {trade._count.messages} msg
                                            </span>
                                        )}
                                    </td>
                                    <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                                    <td>{trade.cardBrand} <span style={{ opacity: 0.6, fontSize: '0.85em' }}>({trade.cardType})</span></td>
                                    <td>{trade.faceValue} {trade.currency}</td>
                                    <td>{trade.payoutNetwork}</td>
                                    <td>
                                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                                            {trade.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Link href={`/user/trades/${trade.tradeId}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85em' }}>
                                                View
                                            </Link>
                                            {trade.status === "PAID" && (
                                                <ConfirmReceiptButton tradeId={trade.tradeId} />
                                            )}
                                        </div>
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
