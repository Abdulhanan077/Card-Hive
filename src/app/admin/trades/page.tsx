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
        <div className="admin-trades-container">
            <div className="admin-dashboard-header">
                <div className="header-text-content">
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                        Trade Management
                    </h1>
                    <p style={{ color: '#64748b', fontWeight: 500 }}>Review submissions, chat with users, and process payouts.</p>
                </div>
                <div className="active-workspaces-badge">
                    {groupedTrades.length} Active Workspaces
                </div>
            </div>

            <div className="card admin-filters-card">
                <form className="admin-filters-form">
                    <div className="filter-search-wrapper">
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
                    <div className="filter-dropdowns-wrapper">
                        <TradeFilterModern />
                    </div>
                    <button type="submit" className="btn btn-primary filter-submit-btn">
                        <HiOutlineFilter /> Apply Filters
                    </button>
                </form>
            </div>

            <div className="card table-card" style={{ padding: 0 }}>
                <div className="table-responsive-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr style={{ background: 'var(--bg-alt)' }}>
                                <th style={{ padding: '1.25rem 1.5rem', minWidth: '200px' }}>Identification</th>
                                <th style={{ minWidth: '200px' }}>Submitter</th>
                                <th style={{ minWidth: '120px' }}>Method</th>
                                <th style={{ minWidth: '150px' }}>Details</th>
                                <th style={{ minWidth: '120px' }}>Value</th>
                                <th style={{ minWidth: '120px' }}>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem', minWidth: '120px' }}>Action</th>
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
                                                        <HiOutlineFolderOpen size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                    ) : (
                                                        <HiOutlineDocumentText size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    )}
                                                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--foreground)', wordBreak: 'break-all' }}>
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
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', flexShrink: 0 }}>
                                                    {String(trade.user.username || 'U').trim().charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{trade.user.username}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trade.user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                                                {trade.payoutMethod === 'CRYPTO' ? (
                                                    <span style={{ color: 'var(--warning)', background: 'var(--warning-light)', padding: '0.3rem 0.6rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>CRYPTO</span>
                                                ) : (
                                                    <span style={{ color: 'var(--info)', background: 'var(--info-light)', padding: '0.3rem 0.6rem', borderRadius: '8px', whiteSpace: 'nowrap' }}>M-MONEY</span>
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
                                                    <div style={{ fontWeight: 700, color: 'var(--foreground)', whiteSpace: 'nowrap' }}>{trade.cardBrand}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{trade.cardType}</div>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                                                {Number(trade.isBatch ? trade.totalValue : trade.faceValue).toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{trade.currency}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${trade.status.toLowerCase()}`} style={{ fontWeight: 800, letterSpacing: '0.02em', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                                                {trade.status.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                                            <Link href={`/admin/trades/${trade.tradeId}`} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: '10px', whiteSpace: 'nowrap' }}>
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
                .admin-trades-container {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .admin-dashboard-header {
                    margin-bottom: 2.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 1rem;
                }
                .active-workspaces-badge {
                    background: #f1f5f9;
                    padding: 0.5rem 1rem;
                    border-radius: 12px;
                    color: #475569;
                    font-weight: 700;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }
                .admin-filters-card {
                    padding: 1.5rem;
                    margin-bottom: 2rem;
                }
                .admin-filters-form {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .filter-search-wrapper {
                    flex: 1;
                    min-width: 250px;
                    position: relative;
                }
                .filter-dropdowns-wrapper {
                    flex: 2;
                    min-width: 350px;
                }
                .filter-submit-btn {
                    padding: 0 2rem;
                    height: 48px;
                    border-radius: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    white-space: nowrap;
                }
                .table-responsive-wrapper {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    width: 100%;
                    border-radius: 16px;
                }
                .trade-row-hover {
                    transition: background-color 0.2s ease;
                }
                .trade-row-hover:hover {
                    background-color: var(--surface-hover) !important;
                }
                
                @media (max-width: 768px) {
                    .admin-trades-container {
                        padding: 1rem;
                    }
                    .admin-dashboard-header {
                        flex-direction: column;
                        align-items: flex-start;
                        margin-bottom: 1.5rem;
                    }
                    .header-text-content h1 {
                        font-size: 1.75rem !important;
                    }
                    .admin-filters-card {
                        padding: 1rem;
                    }
                    .admin-filters-form {
                        flex-direction: column;
                    }
                    .filter-search-wrapper,
                    .filter-dropdowns-wrapper {
                        width: 100%;
                        min-width: 100%;
                    }
                    .filter-submit-btn {
                        width: 100%;
                    }
                    .table-card {
                        border-radius: 12px;
                    }
                    .data-table th, .data-table td {
                        padding: 1rem;
                    }
                }
            `}} />
        </div>
    );
}
