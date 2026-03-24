import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calculateVipTier } from "@/lib/vipTiers";
import ResendAuthEmailButtons from "./ResendAuthEmailButtons";
import UserActionPanelControls from "./UserActionPanelControls";
import UserSortModern from "./UserSortModern";

export default async function AdminUsersList(props: {
    searchParams: Promise<{ query?: string, sort?: string, target?: string }>
}) {
    const searchParams = await props.searchParams;
    const query = searchParams.query;
    const sortBy = searchParams.sort || "newest";
    const targetUsername = searchParams.target;

    const whereClause: Prisma.UserWhereInput = { role: "USER" };

    if (query) {
        whereClause.OR = [
            { username: { contains: query } },
            { email: { contains: query } },
            { phoneNumber: { contains: query } }
        ];
    }

    let orderByClause: any = { createdAt: "desc" };
    if (sortBy === "trades_desc") {
        orderByClause = { trades: { _count: "desc" } };
    } else if (sortBy === "points_desc") {
        orderByClause = { rewardBalance: "desc" };
    } else if (sortBy === "referrals_desc") {
        orderByClause = { referrals: { _count: "desc" } };
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: orderByClause,
        select: {
            id: true,
            username: true,
            email: true,
            phoneNumber: true,
            status: true,
            rewardBalance: true,
            completedTradesCount: true,
            createdAt: true,
            _count: {
                select: {
                    trades: true,
                    referrals: true
                }
            }
        }
    });

    let targetUser = null;
    let cleanTargetUsername = targetUsername || "";
    if (cleanTargetUsername) {
        if (cleanTargetUsername.startsWith('@')) {
            cleanTargetUsername = cleanTargetUsername.substring(1);
        }

        targetUser = await prisma.user.findUnique({
            where: { username: cleanTargetUsername },
            select: {
                id: true,
                username: true,
                rewardBalance: true,
                status: true,
                completedTradesCount: true,
                _count: {
                    select: {
                        trades: {
                            where: { status: { in: ["PAID", "COMPLETED"] } }
                        },
                        referrals: true
                    }
                },
                referrals: {
                    select: {
                        username: true,
                        createdAt: true,
                        completedTradesCount: true,
                        status: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
    }

    function formatDate(date: Date) {
        const d = new Date(date);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
    }

    const getManageUrl = (username: string) => {
        const params = new URLSearchParams();
        params.set("target", username);
        if (query) params.set("query", query);
        if (sortBy !== "newest") params.set("sort", sortBy);
        return `/admin/users?${params.toString()}`;
    };


    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="dashboard-title">Registered Users</h1>
                    <p className="dashboard-subtitle">Manage and view all users registered on the platform.</p>
                </div>
            </div>

            <div className="flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, position: 'relative', zIndex: 50, width: '100%' }}>
                    <form className="flex" style={{ gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                        <input
                            type="search"
                            name="query"
                            defaultValue={query || ""}
                            placeholder="Search User..."
                            className="form-input"
                            style={{ marginBottom: 0, flex: '1 1 200px', minWidth: '150px' }}
                        />
                        <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
                            <UserSortModern />
                        </div>
                        <button type="submit" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>Filter</button>
                    </form>
                </div>
            </div>

            <div className="admin-users-grid">
                <div className="card" style={{ 
                    height: 'fit-content',
                    zIndex: 5
                }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>User Action Panel</h3>

                    <form className="form-group" style={{ marginBottom: "2rem" }}>
                        <label className="form-label" style={{ fontSize: "0.85rem" }}>Select Target User (@username)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                                type="text"
                                name="target"
                                className="form-input"
                                placeholder="e.g. johndoe"
                                defaultValue={targetUsername || ""}
                                style={{ marginBottom: 0, width: '100%', minWidth: 0 }}
                                required
                            />
                            {query && <input type="hidden" name="query" value={query} />}
                            {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
                            <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 1.25rem' }}>Select</button>
                        </div>
                    </form>

                    {targetUser ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>@{targetUser.username}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                    Status: <span style={{ color: targetUser.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{targetUser.status}</span>
                                </div>
                                <div style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                                    VIP Rank: <strong style={{ color: calculateVipTier(targetUser.completedTradesCount || 0).color }}>
                                        {calculateVipTier(targetUser.completedTradesCount || 0).name} ({calculateVipTier(targetUser.completedTradesCount || 0).multiplier}x)
                                    </strong>
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    Reward Points: <strong>{targetUser.rewardBalance}</strong>
                                </div>
                            </div>

                            <UserActionPanelControls 
                                key={`controls-${targetUser.id}`}
                                userId={targetUser.id}
                                username={targetUser.username}
                                status={targetUser.status}
                                completedTradesCount={targetUser.completedTradesCount || 0}
                            />

                            <ResendAuthEmailButtons key={`email-${targetUser.id}`} userId={targetUser.id} />

                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Referrals ({targetUser._count.referrals})</span>
                                    {targetUser._count.referrals > 10 && <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Showing latest 10</span>}
                                </div>
                                {targetUser.referrals.length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5, fontStyle: 'italic' }}>No referrals found.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {targetUser.referrals.map((ref: any, ridx: number) => (
                                            <div key={ridx} style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', padding: '0.4rem', backgroundColor: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Link href={`/admin/users?target=${ref.username}`} style={{ color: 'var(--primary)', fontWeight: 500 }}>@{ref.username}</Link>
                                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        {ref.status === 'BLOCKED' && (
                                                            <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--danger)', color: 'white', padding: '0.1rem 0.2rem', borderRadius: '3px', fontWeight: 700 }}>Blocked</span>
                                                        )}
                                                        <span style={{ fontSize: '0.7rem', color: ref.completedTradesCount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                                            {ref.completedTradesCount > 0 ? 'Qualified' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.6, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Trades: {ref.completedTradesCount}</span>
                                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Points: +{ref.completedTradesCount * 2}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
                            Select a user above to modify points or change account status.
                        </div>
                    )}
                </div>

                <div className="table-container" style={{ minWidth: 0, width: '100%', overflowX: 'auto' }}>
                    {users.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                            No users match the current search.
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Phone Number</th>
                                    <th>Trades Submitted</th>
                                    <th>VIP Rank</th>
                                    <th>Referrals</th>
                                    <th>Reward Pts</th>
                                    <th>Joined Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user: any) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{
                                                width: '10px', height: '10px', borderRadius: '50%',
                                                backgroundColor: user.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)',
                                                display: 'inline-block', marginRight: '0.5rem'
                                            }} title={user.status} />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>@{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>{user.phoneNumber}</td>
                                        <td>
                                            <div style={{ fontWeight: 500, color: 'var(--primary)' }}>
                                                {user._count.trades} trades
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ backgroundColor: calculateVipTier(user.completedTradesCount || 0).color, color: 'white', fontSize: '0.7rem', padding: '0.25rem 0.5rem', fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                                {calculateVipTier(user.completedTradesCount || 0).name}
                                            </span>
                                        </td>
                                        <td>
                                            {user._count.referrals > 0 ? (
                                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>{user._count.referrals}</span>
                                            ) : (
                                                <span style={{ opacity: 0.5 }}>0</span>
                                            )}
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{user.rewardBalance} pts</span>
                                        </td>
                                        <td>
                                            <span style={{ opacity: 0.8, fontSize: '0.9em' }}>
                                                {formatDate(user.createdAt)}
                                            </span>
                                        </td>
                                        <td>
                                            <Link href={getManageUrl(user.username)} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', textDecoration: 'none' }}>
                                                Manage
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}
