import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import ConfirmReceiptButton from "@/components/ConfirmReceiptButton";

type TradeWithCount = Prisma.TradeGetPayload<{
    include: {
        _count: {
            select: {
                messages: {
                    where: {
                        isRead: false,
                        sender: { role: 'ADMIN' }
                    }
                }
            }
        }
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

    const trades = (await prisma.trade.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: {
                    messages: {
                        where: {
                            isRead: false,
                            sender: { role: 'ADMIN' }
                        }
                    }
                }
            }
        }
    })) as any[];

    // Grouping logic for user view
    const groupedTrades: any[] = [];
    const processedBatches = new Set();

    trades.forEach(t => {
        if (!t.fullName || !t.fullName.startsWith('BATCH-')) {
            groupedTrades.push({ ...t, isBatch: false, cardCount: 1 });
        } else if (!processedBatches.has(t.fullName)) {
            const batchMembers = trades.filter(tm => tm.fullName === t.fullName);
            const totalValue = batchMembers.reduce((sum, tm) => sum + tm.faceValue, 0);
            const totalPayout = batchMembers.reduce((sum, tm) => sum + (tm.status !== 'REJECTED' ? (tm.calculatedPayout || 0) : 0), 0);
            const unreadMessages = batchMembers.reduce((sum, tm) => sum + tm._count.messages, 0);

            groupedTrades.push({
                ...t,
                isBatch: true,
                batchId: t.fullName, // Proxy
                cardCount: batchMembers.length,
                totalValue,
                totalPayout,
                batchUnreadCount: unreadMessages,
                batchBrands: Array.from(new Set(batchMembers.map(tm => tm.cardBrand))).join(", ")
            });
            processedBatches.add(t.fullName);
        }
    });

    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ alignItems: 'flex-start' }}>
                <h1 className="dashboard-title">My Trades</h1>
                <p className="dashboard-subtitle">Track the status of all your submitted gift cards.</p>
            </div>

            <div className="table-container" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', width: 'max-content' }}>
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
            </div>

            <div className="table-container">
                {groupedTrades.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6 }}>
                        No trades found matching this status.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Identification</th>
                                <th>Submitted</th>
                                <th>Brands</th>
                                <th>Quantity</th>
                                <th>Est. Payout</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedTrades.map((trade) => (
                                <tr key={trade.id}>
                                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {trade.isBatch ? (
                                                <span title="Batch Submission" style={{ backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold' }}>BATCH</span>
                                            ) : (
                                                <span title="Single Card" style={{ backgroundColor: 'var(--bg-alt)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem' }}>SINGLE</span>
                                            )}
                                            <Link href={`/user/trades/${trade.tradeId}`} style={{ textDecoration: "none" }}>
                                                {trade.isBatch ? trade.batchId : trade.tradeId}
                                            </Link>
                                        </div>
                                        {(trade.isBatch ? trade.batchUnreadCount : trade._count.messages) > 0 && (
                                            <span style={{ marginTop: "4px", display: "inline-block", fontSize: "0.7rem", padding: "1px 5px", backgroundColor: "var(--primary)", color: "white", borderRadius: "10px" }}>
                                                {(trade.isBatch ? trade.batchUnreadCount : trade._count.messages)} new messages
                                            </span>
                                        )}
                                    </td>
                                    <td>{new Date(trade.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {trade.isBatch ? trade.batchBrands : trade.cardBrand}
                                        </div>
                                    </td>
                                    <td>{trade.isBatch ? <strong>{trade.cardCount} Cards</strong> : '1 Card'}</td>
                                    <td style={{ fontWeight: 600, color: "var(--primary)" }}>
                                        GH₵ {(trade.isBatch ? trade.totalPayout : (trade.calculatedPayout || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                                            {trade.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <Link href={`/user/trades/${trade.tradeId}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85em' }}>
                                                Details
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
