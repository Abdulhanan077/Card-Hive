import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChatBox from "@/app/components/ChatBox";
import Link from "next/link";

export default async function UserTradeDetailView(props: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return redirect("/login");

    const params = await props.params;

    const trade = await prisma.trade.findUnique({
        where: { tradeId: params.id },
        include: {
            // messages: { ... } - REPLACED BY RAW SQL BELOW
        }
    });

    if (!trade) {
        return notFound();
    }

    // Manual RAW SQL fetch for messages to include fileUrl and fileType (which Prisma Client doesn't know about yet)
    // We explicitly alias every column to ensure the resulting object has the expected keys
    const rawMessages = await prisma.$queryRaw<any[]>`
        SELECT 
            m.id as id, 
            m."tradeId" as "tradeId", 
            m."senderId" as "senderId", 
            m.content as content, 
            m."isRead" as "isRead", 
            m."readAt" as "readAt", 
            m."fileUrl" as "fileUrl", 
            m."fileType" as "fileType", 
            m."createdAt" as "createdAt",
            json_build_object('id', u.id, 'username', u.username, 'role', u.role) as sender
        FROM "Message" m
        JOIN "User" u ON m."senderId" = u.id
        WHERE m."tradeId" = ${trade.id}
        ORDER BY m."createdAt" ASC
    `;

    // Map raw DB results into normalized message objects
    const messages = rawMessages.map(m => ({
        id: m.id,
        tradeId: m.tradeId,
        senderId: m.senderId,
        content: m.content || "",
        isRead: Boolean(m.isRead),
        readAt: m.readAt ? new Date(m.readAt) : null,
        fileUrl: m.fileUrl || null,
        fileType: m.fileType || null,
        createdAt: new Date(m.createdAt),
        sender: m.sender
    }));

    // Mark admin messages as read when user views their trade
    await prisma.message.updateMany({
        where: {
            tradeId: trade.id,
            isRead: false,
            sender: {
                role: "ADMIN"
            }
        },
        data: {
            isRead: true,
            readAt: new Date()
        }
    });

    // Security: Only the owner can view their own trade
    const currentUserId = parseInt(session.user.id);
    if (trade.userId !== currentUserId) {
        return redirect("/user/trades");
    }

    // If it's a batch, fetch all members
    let batchTrades: any[] = [];
    if (trade.fullName && trade.fullName.startsWith('BATCH-')) {
        batchTrades = await prisma.trade.findMany({
            where: { fullName: trade.fullName },
            orderBy: { id: "asc" }
        });
    } else {
        batchTrades = [trade as any];
    }

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>

            <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Link href="/user/trades" className="btn btn-outline" style={{ padding: "0.5rem 1rem" }}>
                    &larr; Back
                </Link>
                <div>
                    <h1 className="dashboard-title" style={{ margin: 0 }}>
                        {trade.fullName && trade.fullName.startsWith('BATCH-') ? `Batch Trade: ${trade.fullName}` : `Trade: ${trade.tradeId}`}
                    </h1>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.5rem" }}>
                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                            {trade.status.replace("_", " ")}
                        </span>
                        <span style={{ opacity: 0.7 }}>Submitted on {new Date(trade.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 chat-layout" style={{ gap: "2rem", height: "calc(100vh - 250px)", minHeight: "600px" }}>

                {/* Left Column: Trade Details Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "0.5rem" }}>

                    <div className="card">
                        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                            {batchTrades.length > 1 ? `Batch Items (${batchTrades.length})` : 'Gift Card Details'}
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} style={{
                                    padding: "1rem",
                                    backgroundColor: "var(--bg-alt)",
                                    borderRadius: "var(--radius-md)",
                                    border: t.tradeId === trade.tradeId ? "1px solid var(--primary)" : "1px solid transparent"
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                        <span>#{idx + 1}: {t.cardBrand}</span>
                                        <span className={`badge badge-${t.status.toLowerCase()}`} style={{ fontSize: "0.7rem" }}>
                                            {t.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Value:</span> {t.faceValue} {t.currency}
                                        </div>
                                        <div>
                                            <span style={{ opacity: 0.7 }}>Type:</span> {t.cardType}
                                        </div>
                                        <div style={{ gridColumn: "span 2", marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border)", color: "var(--primary)", fontWeight: "bold" }}>
                                            Payout: GH₵ {t.calculatedPayout?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {batchTrades.length > 1 && (
                            <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "var(--primary-light)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--primary)" }}>
                                <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>Total Estimated Payout</div>
                                <strong style={{ fontSize: "1.5rem" }}>
                                    GH₵ {batchTrades.reduce((sum: number, t: any) => sum + (t.status !== 'REJECTED' ? (t.calculatedPayout || 0) : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </strong>
                                <p style={{ fontSize: "0.7rem", marginTop: "0.5rem", opacity: 0.7 }}>
                                    (Excludes rejected cards)
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                            Payout Target
                        </h3>
                        {trade.payoutMethod === 'CRYPTO' ? (
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--primary)" }}>
                                    {trade.cryptoCoin} ({trade.cryptoNetwork})
                                </div>
                                <div style={{ fontSize: "0.9rem", color: "var(--primary)", marginTop: "0.25rem" }}>
                                    Exchange: <strong>{trade.cryptoExchange}</strong>
                                </div>
                                <div style={{ marginTop: "0.75rem", padding: "0.5rem", backgroundColor: "var(--bg-alt)", borderRadius: "4px", fontSize: "0.85rem", wordBreak: "break-all" }}>
                                    <div style={{ opacity: 0.7, marginBottom: "0.25rem" }}>
                                        {trade.cryptoReceiverIdType === 'WALLET_ADDRESS' ? 'Wallet Address:' : 'Exchange ID:'}
                                    </div>
                                    <code style={{ fontWeight: "bold" }}>{trade.cryptoReceiverId}</code>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{trade.payoutNetwork}</div>
                                {trade.payoutAccountName && (
                                    <div style={{ fontSize: "1rem", opacity: 0.8, marginTop: "0.25rem" }}>
                                        {trade.payoutAccountName}
                                    </div>
                                )}
                                <div style={{ color: "var(--primary)", fontSize: "1.2rem", marginTop: "0.25rem" }}>{trade.payoutPhoneNumber}</div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Right Column: Chat System */}
                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0 }}>Support Chat</h3>
                        <p style={{ opacity: 0.7, fontSize: "0.9rem", margin: 0 }}>Message an admin directly about this trade.</p>
                    </div>

                    <ChatBox
                        tradeId={trade.id}
                        messages={messages}
                        currentUserId={currentUserId}
                        currentUsername={session.user.name || "User"}
                        path={`/user/trades/${trade.tradeId}`}
                    />
                </div>

            </div>

        </div>
    );
}
