import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calculateVipTier } from "@/lib/vipTiers";
import ResendAuthEmailButtons from "./ResendAuthEmailButtons";

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
        include: {
            _count: {
                select: { trades: true, referrals: true }
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
            select: { id: true, username: true, rewardBalance: true, status: true, completedTradesCount: true, _count: { select: { trades: true, referrals: true } } }
        });
    }

    const getManageUrl = (username: string) => {
        const params = new URLSearchParams();
        params.set("target", username);
        if (query) params.set("query", query);
        if (sortBy !== "newest") params.set("sort", sortBy);
        return `/admin/users?${params.toString()}`;
    };

    async function manageUser(formData: FormData) {
        "use server";
        const userId = parseInt(formData.get("userId") as string);
        const action = formData.get("action") as string;

        if (!userId || !action) return;

        if (action === "add_points" || action === "deduct_points") {
            const points = parseFloat(formData.get("points") as string);
            if (isNaN(points) || points <= 0) return;
            const modifier = action === "deduct_points" ? -points : points;

            await prisma.user.update({
                where: { id: userId },
                data: { rewardBalance: { increment: modifier } },
            });
        } else if (action === "block") {
            await prisma.user.update({
                where: { id: userId },
                data: { status: "BLOCKED" }
            });
        } else if (action === "activate") {
            await prisma.user.update({
                where: { id: userId },
                data: { status: "ACTIVE" }
            });
        }

        revalidatePath("/admin/users");
        revalidatePath("/user");
    }

    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="dashboard-title">Registered Users</h1>
                    <p className="dashboard-subtitle">Manage and view all users registered on the platform.</p>
                </div>
            </div>

            <div className="flex-mobile-col" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem', gap: '1rem' }}>
                <form className="flex-mobile-col" style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '700px' }}>
                    <input
                        type="search"
                        name="query"
                        defaultValue={query || ""}
                        placeholder="Search Username, Email, or Phone..."
                        className="form-input"
                        style={{ marginBottom: 0, flex: 1 }}
                    />
                    <select name="sort" defaultValue={sortBy} className="form-select" style={{ marginBottom: 0, width: 'auto' }}>
                        <option value="newest">Newest First</option>
                        <option value="trades_desc">Most Trades</option>
                        <option value="points_desc">Most Reward Points</option>
                        <option value="referrals_desc">Most Referrals</option>
                    </select>
                    <button type="submit" className="btn btn-secondary">Search</button>
                </form>
            </div>

            <div className="flex flex-mobile-col" style={{ gap: '2rem', alignItems: 'flex-start' }}>
                <div className="card" style={{ flexShrink: 0, width: '100%', maxWidth: '350px', height: 'fit-content', position: 'sticky', top: '2rem' }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>User Action Panel</h3>

                    <form className="form-group" style={{ marginBottom: "2rem" }}>
                        <label className="form-label" style={{ fontSize: "0.85rem" }}>Select Target User (@username)</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="text"
                                name="target"
                                className="form-input"
                                placeholder="e.g. johndoe"
                                defaultValue={targetUsername || ""}
                                style={{ marginBottom: 0 }}
                                required
                            />
                            {query && <input type="hidden" name="query" value={query} />}
                            {searchParams.sort && <input type="hidden" name="sort" value={searchParams.sort} />}
                            <button type="submit" className="btn btn-secondary">Select</button>
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

                            <form action={manageUser} className="form-group" style={{ padding: '1rem', backgroundColor: 'var(--bg-alt)', borderRadius: 'var(--radius-md)' }}>
                                <label className="form-label" style={{ fontSize: "0.85rem", color: 'var(--warning)', fontWeight: 600 }}>Modify Points</label>
                                <input type="hidden" name="userId" value={targetUser.id} />
                                <input type="number" name="points" placeholder="Amount (e.g. 50)" min="1" step="any" required className="form-input" style={{ marginBottom: '0.75rem' }} />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="submit" name="action" value="add_points" className="btn btn-primary" style={{ flex: 1, padding: '0.5rem' }}>Reward</button>
                                    <button type="submit" name="action" value="deduct_points" className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', backgroundColor: '#fef2f2', color: 'var(--danger)', border: '1px solid currentColor' }}>Deduct</button>
                                </div>
                            </form>

                            <form action={manageUser} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="hidden" name="userId" value={targetUser.id} />
                                {targetUser.status === 'ACTIVE' ? (
                                    <button type="submit" name="action" value="block" className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', border: '1px solid currentColor' }}>Block Account</button>
                                ) : (
                                    <button type="submit" name="action" value="activate" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white' }}>Activate Account</button>
                                )}
                            </form>

                            <ResendAuthEmailButtons userId={targetUser.id} />
                        </div>
                    ) : (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', opacity: 0.6, fontSize: '0.9rem', borderTop: '1px solid var(--border)' }}>
                            Select a user above to modify points or change account status.
                        </div>
                    )}
                </div>

                <div className="table-container" style={{ flex: 1, minWidth: 0, width: '100%' }}>
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
                                {users.map((user) => (
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
                                            <span className="badge" style={{ backgroundColor: calculateVipTier(user.completedTradesCount || 0).color, color: '#000', fontSize: '0.7rem', padding: '0.25rem 0.5rem', fontWeight: 700 }}>
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
                                                {new Date(user.createdAt).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
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
