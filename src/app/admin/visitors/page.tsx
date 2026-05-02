import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format, startOfDay, startOfMonth, startOfYear } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function VisitorsPage() {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
        redirect("/login");
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    // Fetch metrics in parallel
    const [
        visitsToday,
        visitsThisMonth,
        visitsThisYear,
        recentLogs
    ] = await Promise.all([
        prisma.visitorLog.count({ where: { createdAt: { gte: todayStart } } }),
        prisma.visitorLog.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.visitorLog.count({ where: { createdAt: { gte: yearStart } } }),
        prisma.visitorLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 200, // Just the most recent 200 for the table
        })
    ]);

    // Unique IPs today
    const logsToday = await prisma.visitorLog.findMany({
        where: { createdAt: { gte: todayStart } },
        select: { ipAddress: true }
    });
    const uniqueIpsToday = new Set(logsToday.map(l => l.ipAddress)).size;

    return (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: "var(--foreground)" }}>Visitor Analytics</h1>
                <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Track site traffic over time.</p>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2.5rem"
            }}>
                <div style={{ background: "var(--card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Visits Today</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{visitsToday}</div>
                        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>({uniqueIpsToday} unique)</div>
                    </div>
                </div>
                <div style={{ background: "var(--card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Visits This Month</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--foreground)", marginTop: "0.5rem" }}>{visitsThisMonth}</div>
                </div>
                <div style={{ background: "var(--card)", padding: "1.5rem", borderRadius: "16px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Visits This Year</div>
                    <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--foreground)", marginTop: "0.5rem" }}>{visitsThisYear}</div>
                </div>
            </div>

            <div style={{ background: "var(--card)", borderRadius: "16px", border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)" }}>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>Recent Activity</h2>
                </div>
                <div>
                    <table className="responsive-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "var(--background)" }}>
                                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Time</th>
                                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>IP Address</th>
                                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Path</th>
                                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Device / OS</th>
                                <th style={{ padding: "1rem 1.5rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>Browser</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                        No visitor logs found yet.
                                    </td>
                                </tr>
                            ) : (
                                recentLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} className="hover-bg-muted responsive-row">
                                        <td data-label="Time" style={{ padding: "1rem 1.5rem", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
                                            {format(new Date(log.createdAt), "MMM d, HH:mm:ss")}
                                        </td>
                                        <td data-label="IP Address" style={{ padding: "1rem 1.5rem", fontSize: "0.9rem", fontFamily: "monospace", color: "var(--primary)", fontWeight: 500 }}>
                                            {log.ipAddress || "Unknown"}
                                        </td>
                                        <td data-label="Path" style={{ padding: "1rem 1.5rem", fontSize: "0.9rem", wordBreak: "break-all" }}>
                                            {log.path || "/"}
                                        </td>
                                        <td data-label="Device / OS" style={{ padding: "1rem 1.5rem", fontSize: "0.9rem" }}>
                                            {log.device} • {log.os}
                                        </td>
                                        <td data-label="Browser" style={{ padding: "1rem 1.5rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                                            {log.browser}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .hover-bg-muted:hover {
                    background-color: var(--background);
                }
                
                @media (max-width: 768px) {
                    .responsive-table thead {
                        display: none;
                    }
                    .responsive-table tbody {
                        display: block;
                        width: 100%;
                    }
                    .responsive-table tr.responsive-row {
                        display: flex;
                        flex-direction: column;
                        padding: 1rem 0;
                        background: var(--card);
                    }
                    .responsive-table td {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 0.5rem 1.5rem !important;
                        border-bottom: none !important;
                        text-align: right;
                    }
                    .responsive-table td::before {
                        content: attr(data-label);
                        font-weight: 600;
                        color: var(--text-muted);
                        text-transform: uppercase;
                        font-size: 0.75rem;
                        letter-spacing: 0.05em;
                        text-align: left;
                        margin-right: 1rem;
                    }
                }
            `}} />
        </div>
    );
}
