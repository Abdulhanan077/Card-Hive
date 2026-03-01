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

    const trades = await prisma.trade.findMany({
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
                {trades.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                        No trades match the current filters.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Trade ID</th>
                                <th>Submitter</th>
                                <th>Contact Phone</th>
                                <th>Card details</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((trade) => (
                                <tr key={trade.id}>
                                    <td style={{ fontWeight: 600 }}>
                                        {trade.tradeId}
                                        {trade._count.messages > 0 && (
                                            <span style={{ marginLeft: "6px", fontSize: "0.75rem", padding: "2px 6px", backgroundColor: "var(--primary)", color: "white", borderRadius: "10px" }}>
                                                {trade._count.messages} msg
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
                                        {trade.cardBrand} <span style={{ opacity: 0.6, fontSize: '0.85em' }}>({trade.cardType})</span>
                                    </td>
                                    <td style={{ fontWeight: 500, color: 'var(--primary)' }}>${trade.faceValue.toFixed(2)}</td>
                                    <td>
                                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                                            {trade.status.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td>
                                        <Link href={`/admin/trades/${trade.tradeId}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85em' }}>
                                            View Details
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
