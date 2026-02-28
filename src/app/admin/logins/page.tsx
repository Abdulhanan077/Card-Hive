import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LoginPortal } from "@prisma/client";

export default async function AdminLoginLogs(props: {
    searchParams: Promise<{ portal?: string, success?: string, query?: string }>
}) {
    const searchParams = await props.searchParams;
    const portalFilter = searchParams.portal;
    const successFilter = searchParams.success;
    const query = searchParams.query;

    const whereClause: any = {};

    if (portalFilter && ["USER", "ADMIN"].includes(portalFilter)) {
        whereClause.portal = portalFilter as LoginPortal;
    }

    if (successFilter === 'success') {
        whereClause.success = true;
    } else if (successFilter === 'failed') {
        whereClause.success = false;
    }

    if (query) {
        whereClause.OR = [
            { emailOrUsername: { contains: query, mode: 'insensitive' } },
            { ipAddress: { contains: query } }
        ];
    }

    const logs = await prisma.loginEvent.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
            user: {
                select: { username: true, email: true }
            }
        }
    });

    return (
        <>
            <div className="dashboard-header flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="dashboard-title">Login Activity Logs</h1>
                    <p className="dashboard-subtitle">Monitor all login attempts across User and Admin portals.</p>
                </div>
            </div>

            <div className="flex-mobile-col" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href="/admin/logins" className={`btn ${!portalFilter ? 'btn-primary' : 'btn-secondary'}`}>All Portals</Link>
                    <Link href={`/admin/logins?portal=USER${successFilter ? `&success=${successFilter}` : ''}`} className={`btn ${portalFilter === 'USER' ? 'btn-primary' : 'btn-secondary'}`}>User Portal</Link>
                    <Link href={`/admin/logins?portal=ADMIN${successFilter ? `&success=${successFilter}` : ''}`} className={`btn ${portalFilter === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}`}>Admin Portal</Link>

                    <div style={{ width: '1px', backgroundColor: 'var(--border)', margin: '0 0.5rem' }}></div>

                    <Link href={`/admin/logins?success=success${portalFilter ? `&portal=${portalFilter}` : ''}`} className={`btn ${successFilter === 'success' ? 'btn-primary' : 'btn-secondary'}`} style={{ backgroundColor: successFilter === 'success' ? 'var(--success)' : '' }}>Success Only</Link>
                    <Link href={`/admin/logins?success=failed${portalFilter ? `&portal=${portalFilter}` : ''}`} className={`btn ${successFilter === 'failed' ? 'btn-primary' : 'btn-secondary'}`} style={{ backgroundColor: successFilter === 'failed' ? 'var(--danger)' : '', color: successFilter === 'failed' ? 'white' : '' }}>Failed Only</Link>
                </div>

                <form className="flex-mobile-col" style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '400px' }}>
                    {portalFilter && <input type="hidden" name="portal" value={portalFilter} />}
                    {successFilter && <input type="hidden" name="success" value={successFilter} />}
                    <input
                        type="search"
                        name="query"
                        defaultValue={query || ""}
                        placeholder="Search Username or IP..."
                        className="form-input"
                        style={{ marginBottom: 0 }}
                    />
                    <button type="submit" className="btn btn-secondary">Search</button>
                </form>
            </div>

            <div className="table-container">
                {logs.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
                        No login events recorded yet.
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>User / Attempted As</th>
                                <th>Portal</th>
                                <th>Status</th>
                                <th>IP Address</th>
                                <th>Device / User Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log: any) => (
                                <tr key={log.id}>
                                    <td style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontWeight: 500 }}>
                                            {new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        <div style={{ opacity: 0.6, fontSize: '0.8rem' }}>
                                            {new Date(log.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td>
                                        {log.user ? (
                                            <div>
                                                <Link href={`/admin/users?target=${log.user.username}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                                                    @{log.user.username}
                                                </Link>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{log.user.email}</div>
                                            </div>
                                        ) : (
                                            <div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{log.emailOrUsername}</span>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Non-existent / Failed</div>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: log.portal === 'ADMIN' ? '#fef3c7' : '#e0f2fe',
                                            color: log.portal === 'ADMIN' ? '#92400e' : '#0369a1'
                                        }}>
                                            {log.portal}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${log.success ? 'paid' : 'rejected'}`}>
                                            {log.success ? 'SUCCESS' : 'FAILED'}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ipAddress}</td>
                                    <td style={{ maxWidth: '200px' }}>
                                        <div
                                            style={{
                                                fontSize: '0.75rem',
                                                opacity: 0.7,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                            title={log.userAgent || ''}
                                        >
                                            {log.userAgent}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.85rem', opacity: 0.6, textAlign: 'right' }}>
                Showing last {logs.length} login attempts.
            </div>
        </>
    );
}
