import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// Define the type we expect back from prisma with include
type TradeWithUserAndCount = Prisma.TradeGetPayload<{
    include: {
        user: { select: { username: true, email: true } },
        _count: {
            select: {
                messages: {
                    where: {
                        isRead: false,
                        sender: { role: "USER" }
                    }
                }
            }
        }
    }
}>;

export default async function AdminTradesList(props: {
    searchParams: Promise<{ status?: string, query?: string }>
}) {
    const searchParams = await props.searchParams;
    const statusFilter = searchParams.status;
    const payoutMethodFilter = (searchParams as any).payoutMethod;
    const query = searchParams.query;

    const whereClause: any = {};

    if (statusFilter && ["PENDING", "UNDER_REVIEW", "PAID", "COMPLETED", "REJECTED"].includes(statusFilter)) {
        whereClause.status = statusFilter;
    }

    if (payoutMethodFilter && ["MOBILE_MONEY", "CRYPTO"].includes(payoutMethodFilter)) {
        whereClause.payoutMethod = payoutMethodFilter;
    }


    if (query) {
        whereClause.OR = [
            { tradeId: { contains: query } },
            { cardBrand: { contains: query } },
            { payoutPhoneNumber: { contains: query } }
        ];
    }

    const trades = (await prisma.trade.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
            user: {
                select: { username: true, email: true }
            },
            _count: {
                select: {
                    messages: {
                        where: {
                            isRead: false,
                            sender: { role: "USER" }
                        }
                    }
                }
            }
        }
    })) as any[];

    // Grouping logic for batches
    const groupedTrades: any[] = [];
    const processedBatches = new Set();

    trades.forEach(t => {
        if (!t.fullName || !t.fullName.startsWith('BATCH-')) {
            groupedTrades.push({ ...t, isBatch: false, cardCount: 1 });
        } else if (!processedBatches.has(t.fullName)) {
            const batchMembers = trades.filter(tm => tm.fullName === t.fullName);
            const totalValue = batchMembers.reduce((sum, tm) => sum + tm.faceValue, 0);
            const batchUnreadCount = batchMembers.reduce((sum, tm) => sum + (tm._count?.messages || 0), 0);

            groupedTrades.push({
                ...t,
                isBatch: true,
                batchId: t.fullName,
                cardCount: batchMembers.length,
                totalValue,
                batchUnreadCount: batchUnreadCount,
                batchBrands: Array.from(new Set(batchMembers.map(tm => tm.cardBrand))).join(", ")
            });
            processedBatches.add(t.fullName);
        }
    });

    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="dashboard-title">Manage Trades</h1>
                    <p className="dashboard-subtitle">Search, filter, and review all gift card submissions.</p>
                </div>
            </div>

            <div className="flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href="/admin/trades" className={`btn ${!statusFilter ? 'btn-primary' : 'btn-secondary'}`}>All</Link>
                    <Link href="/admin/trades?status=PENDING" className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}>Pending</Link>
                    <Link href="/admin/trades?status=UNDER_REVIEW" className={`btn ${statusFilter === 'UNDER_REVIEW' ? 'btn-primary' : 'btn-secondary'}`}>Under Review</Link>
                    <Link href="/admin/trades?status=PAID" className={`btn ${statusFilter === 'PAID' ? 'btn-primary' : 'btn-secondary'}`}>Paid</Link>
                    <Link href="/admin/trades?status=COMPLETED" className={`btn ${statusFilter === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}>Completed</Link>
                    <Link href="/admin/trades?status=REJECTED" className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}>Rejected</Link>
                    <span style={{ borderLeft: '1px solid var(--border)', margin: '0 0.5rem' }}></span>
                    <Link href="/admin/trades?payoutMethod=CRYPTO" className={`btn ${payoutMethodFilter === 'CRYPTO' ? 'btn-primary' : 'btn-secondary'}`}>Crypto Only</Link>
                </div>


                <form className="flex-mobile-col" style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '100%' }}>
                    {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                    <input
                        type="search"
                        name="query"
                        defaultValue={query || ""}
                        placeholder="Search Trade ID, Brand, or Phone..."
                        className="form-input"
                        style={{ marginBottom: 0 }}
                    />
                    <button type="submit" className="btn btn-secondary">Search</button>
                </form>
            </div>

            <div className="table-container">
                {groupedTrades.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                        No trades match the current filters.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Identification</th>
                                <th>Submitter</th>
                                <th>Contact/Payout</th>
                                <th>Items</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedTrades.map((trade) => (
                                <tr key={trade.id} style={{
                                    backgroundColor: trade.status === 'REJECTED' ? '#fff5f5' : 'inherit',
                                    borderLeft: trade.status === 'REJECTED' ? '4px solid #ef4444' : 'none'
                                }}>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {trade.isBatch ? (
                                                <span title="Batch Trade" style={{ backgroundColor: 'var(--primary-light)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--primary)' }}>BATCH</span>
                                            ) : (
                                                <span title="Single Trade" style={{ backgroundColor: 'var(--bg-alt)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>SINGLE</span>
                                            )}
                                            {trade.isBatch ? trade.batchId : trade.tradeId}
                                        </div>
                                        {(trade.isBatch ? trade.batchUnreadCount : trade._count.messages) > 0 && (
                                            <span style={{ marginTop: "4px", display: "inline-block", fontSize: "0.7rem", padding: "1px 5px", backgroundColor: "var(--danger)", color: "white", borderRadius: "10px" }}>
                                                {trade.isBatch ? trade.batchUnreadCount : trade._count.messages} new msg
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>@{trade.user.username}</div>
                                        <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{trade.user.email}</div>
                                    </td>
                                    <td>
                                        {trade.payoutMethod === 'CRYPTO' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                <span className="badge badge-paid" style={{ fontSize: '0.7rem', padding: '2px 6px', width: 'fit-content' }}>CRYPTO</span>
                                                <div style={{ fontSize: '0.85rem' }}>{trade.cryptoCoin} ({trade.cryptoNetwork})</div>
                                            </div>
                                        ) : (
                                            trade.payoutPhoneNumber
                                        )}
                                    </td>

                                    <td>
                                        {trade.isBatch ? (
                                            <div style={{ fontSize: '0.9rem' }}>
                                                <strong>{trade.cardCount} Cards</strong>
                                                <div style={{ opacity: 0.6, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                                                    {trade.batchBrands}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {trade.cardBrand} <span style={{ opacity: 0.6, fontSize: '0.85em' }}>({trade.cardType})</span>
                                            </>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 500, color: 'var(--primary)' }}>
                                        {(trade.isBatch ? trade.totalValue : trade.faceValue).toFixed(2)} {trade.currency}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${trade.status.toLowerCase()}`} style={trade.status === 'REJECTED' ? { backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold' } : {}}>
                                            {trade.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <Link href={`/admin/trades/${trade.tradeId}`} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85em' }}>
                                            {trade.isBatch ? 'Open Workspace' : 'Review Card'}
                                        </Link>
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
