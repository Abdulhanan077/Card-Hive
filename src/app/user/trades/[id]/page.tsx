import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChatBox from "@/app/components/ChatBox";
import Link from "next/link";
import "@/app/trade-details.css";
import SafeImage from "@/app/components/SafeImage";

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
    const parsedImages: string[] = JSON.parse(trade.imageUrls || "[]");

    return (
        <div className="trade-details-container">
            <div className="trade-header">
                <Link href="/user/trades" className="btn-back">
                    &larr; Back
                </Link>
                <div className="header-content">
                    <h1 className="trade-title">
                        {trade.fullName && trade.fullName.startsWith('BATCH-') ? `Batch Trade: ${trade.fullName}` : `Trade: ${trade.tradeId}`}
                    </h1>
                    <div className="header-meta">
                        <span className={`badge badge-${trade.status.toLowerCase()}`}>
                            {trade.status.replace("_", " ")}
                        </span>
                        <span className="submission-date">Submitted on {new Date(trade.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            <div className="trade-grid">
                {/* Left Column: Trade Details Summary */}
                <div className="details-column">
                    <div className="card">
                        <h3 className="section-title">
                            {batchTrades.length > 1 ? `Batch Items (${batchTrades.length})` : 'Gift Card Details'}
                        </h3>

                        <div className="batch-list">
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} className={`batch-item ${t.id === trade.id ? 'active' : ''}`}>
                                    <div className="batch-item-header">
                                        <span className="item-label">#{idx + 1}: {t.cardBrand}</span>
                                        <span className={`badge badge-${t.status.toLowerCase()}`} style={{ fontSize: "0.7rem" }}>
                                            {t.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="batch-item-grid">
                                        <div className="item-field">
                                            <span className="field-label">Value:</span> {t.faceValue} {t.currency}
                                        </div>
                                        <div className="item-field">
                                            <span className="field-label">Type:</span> {t.cardType}
                                        </div>
                                        <div className="item-payout">
                                            Payout: GH₵ {t.calculatedPayout?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {batchTrades.length > 1 && (
                            <div className="total-payout-card">
                                <div className="total-label">Total Estimated Payout</div>
                                <strong className="total-value">
                                    GH₵ {batchTrades.reduce((sum: number, t: any) => sum + (t.status !== 'REJECTED' ? (t.calculatedPayout || 0) : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </strong>
                                <p className="total-hint">(Excludes rejected cards)</p>
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="section-title">Payout Target</h3>
                        {trade.payoutMethod === 'CRYPTO' ? (
                            <div className="payout-content">
                                <div className="payout-main crypto">
                                    {trade.cryptoCoin} ({trade.cryptoNetwork})
                                </div>
                                <div className="payout-sub">
                                    Exchange: <strong>{trade.cryptoExchange}</strong>
                                </div>
                                <div className="payout-id-box">
                                    <div className="id-label">
                                        {trade.cryptoReceiverIdType === 'WALLET_ADDRESS' ? 'Wallet Address:' : 'Exchange ID:'}
                                    </div>
                                    <code className="id-value">{trade.cryptoReceiverId}</code>
                                </div>
                            </div>
                        ) : (
                            <div className="payout-content">
                                <div className="payout-main">{trade.payoutNetwork}</div>
                                {trade.payoutAccountName && (
                                    <div className="payout-info">{trade.payoutAccountName}</div>
                                )}
                                <div className="payout-highlight">{trade.payoutPhoneNumber}</div>
                            </div>
                        )}
                    </div>

                    {/* Shared Evidence Images */}
                    {parsedImages.length > 0 && (
                        <div className="card">
                            <h3 className="section-title no-border">Uploaded Proof (Shared)</h3>
                            <div className="image-grid">
                                {parsedImages.map((src, idx) => (
                                    <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="proof-link">
                                        <SafeImage src={src} alt="proof" className="proof-image" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Chat System */}
                <div className="chat-column">
                    <div className="chat-header">
                        <h3 className="section-title m-0">Support Chat</h3>
                        <p className="chat-subtitle">Message an admin directly about this trade.</p>
                    </div>

                    <div className="chat-container">
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

        </div>
    );
}
