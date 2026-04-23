import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import TradeFilterModern from "./TradeFilterModern";
import { 
    HiOutlineSearch, 
    HiOutlineFilter, 
    HiOutlineFolderOpen, 
    HiOutlineDocumentText, 
    HiOutlineChatAlt2,
    HiOutlineCash,
    HiOutlineLightningBolt
} from "react-icons/hi";

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
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                        Trade Management
                    </h1>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Review submissions, chat with users, and process payouts.</p>
                </div>
                <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '12px', color: '#475569', fontWeight: 700, fontSize: '0.9rem' }}>
                    {groupedTrades.length} Active Workspaces
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                <form style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                        <HiOutlineSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <input
                            type="search"
                            name="query"
                            defaultValue={query || ""}
                            placeholder="Search by ID, brand, or account..."
                            className="form-input"
                            style={{ marginBottom: 0, paddingLeft: '3rem', height: '48px', borderRadius: '12px' }}
                        />
                    </div>
                    <div style={{ flex: 2, minWidth: '350px' }}>
                        <TradeFilterModern />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0 2rem', height: '48px', borderRadius: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HiOutlineFilter /> Apply Filters
                    </button>
                </form>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container" style={{ margin: 0 }}>
                    <table className="data-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-alt)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', width: '180px' }}>Identification</th>
                                <th style={{ width: '300px' }}>Submitter</th>
                                <th style={{ width: '120px' }}>Method</th>
                                <th>Details</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedTrades.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '5rem', textAlign: 'center', color: '#94a3b8' }}>
                                        No trades found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                groupedTrades.map((trade) => (
                                    <tr key={trade.id} className="trade-row-hover">
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {trade.isBatch ? (
                                                        <HiOutlineFolderOpen size={18} style={{ color: 'var(--primary)' }} />
                                                    ) : (
                                                        <HiOutlineDocumentText size={18} style={{ color: 'var(--text-muted)' }} />
                                                    )}
                                                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--foreground)' }}>
                                                        {trade.isBatch ? trade.batchId : trade.tradeId}
                                                    </span>
                                                </div>
                                                {(trade.isBatch ? trade.batchUnreadCount : trade._count.messages) > 0 && (
                                                    <div style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '4px',
                                                        fontSize: '0.75rem', 
                                                        fontWeight: 700,
                                                        color: 'var(--danger)',
                                                        background: 'var(--danger-light)',
                                                        padding: '0.2rem 0.6rem',
                                                        borderRadius: '100px',
                                                        width: 'fit-content'
                                                    }}>
                                                        <HiOutlineChatAlt2 /> {trade.isBatch ? trade.batchUnreadCount : trade._count.messages} New
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    {String(trade.user.username || 'U').trim().charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>@{trade.user.username}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trade.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                                                {trade.payoutMethod === 'CRYPTO' ? (
                                                    <span style={{ color: 'var(--warning)', background: 'var(--warning-light)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>CRYPTO</span>
                                                ) : (
                                                    <span style={{ color: 'var(--info)', background: 'var(--info-light)', padding: '0.3rem 0.6rem', borderRadius: '8px' }}>M-MONEY</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {trade.isBatch ? (
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{trade.cardCount} Cards</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {trade.batchBrands}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 700, color: 'var(--foreground)' }}>{trade.cardBrand}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trade.cardType}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>
                                                {Number(trade.isBatch ? trade.totalValue : trade.faceValue).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{trade.currency}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${trade.status.toLowerCase()}`} style={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: '0.7rem' }}>
                                                {trade.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                                            <Link href={`/admin/trades/${trade.tradeId}`} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px' }}>
                                                {trade.isBatch ? 'Workspace' : 'Review'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .trade-row-hover {
                    transition: background-color 0.2s ease;
                }
                .trade-row-hover:hover {
                    background-color: var(--surface-hover) !important;
                }
            `}} />
        </div>
    );
}
