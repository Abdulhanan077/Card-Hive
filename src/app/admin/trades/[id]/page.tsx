import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import ChatBox from "@/app/components/ChatBox";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import "@/app/trade-details.css";
import CopyButton from "@/components/CopyButton";
import { calculateVipTier } from "@/lib/vipTiers";
import DownloadButton from "./DownloadButton";
import ResendEmailButtons from "./ResendEmailButtons";
import SafeImage from "@/app/components/SafeImage";
import StatusControlsClient from "./StatusControlsClient";
import StatusSelector from "./StatusSelector";
import RejectCardButton from "./RejectCardButton";
import { updateBatchStatusAction } from "@/app/actions/admin-trade-actions";

export default async function TradeDetailView(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const trade = await prisma.trade.findUnique({
        where: { tradeId: params.id },
        include: {
            user: true,
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
            m."isEdited" as "isEdited",
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
        isEdited: Boolean(m.isEdited),
        createdAt: new Date(m.createdAt),
        sender: m.sender
    }));

    // Fetch batch trades if applicable (include user for each card)
    let batchTrades: any[] = [];
    if (trade && trade.fullName && trade.fullName.startsWith('BATCH-')) {
        batchTrades = await prisma.trade.findMany({
            where: { fullName: trade.fullName },
            include: { user: true }, // Ensure user is included for batch members
            orderBy: { createdAt: 'asc' }
        });
    } else {
        // If it's not a batch, treat the current trade as a batch of one
        batchTrades = [trade as any];
    }

    // The original `tradeWithBatchId` was used to access `batchId`.
    // Now we'll use `trade.fullName` to determine if it's a batch and for batch-related operations.
    const isBatchTrade = trade.fullName && trade.fullName.startsWith('BATCH-');
    const batchIdentifier = isBatchTrade ? trade.fullName : undefined;


    // Mark user messages as read only if there are unread ones
    const unreadCount = await prisma.message.count({
        where: {
            tradeId: { in: batchTrades.map((t: any) => t.id) },
            isRead: false,
            sender: { role: "USER" }
        }
    });

    if (unreadCount > 0) {
        await prisma.message.updateMany({
            where: {
                tradeId: { in: batchTrades.map((t: any) => t.id) },
                isRead: false,
                sender: { role: "USER" }
            },
            data: { isRead: true, readAt: new Date() }
        });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return redirect("/login");
    const currentUserId = parseInt(session.user.id);

    // Duplicate explicit check (per card)
    const duplicateWarnings = await prisma.trade.findMany({
        where: {
            cardCodeHash: { in: batchTrades.map((t: any) => t.cardCodeHash) },
            id: { notIn: batchTrades.map((t: any) => t.id) }
        }
    } as any);

    const parsedImages: string[] = JSON.parse(trade.imageUrls || "[]");

    const handleUpdateBatchStatus = async (formData: FormData) => {
        "use server";
        return updateBatchStatusAction(formData, params.id, trade.fullName, trade.tradeId);
    };

    const rawSettings: any = await prisma.$queryRawUnsafe(`SELECT "usdtExchangeRate" FROM "Settings" LIMIT 1`);
    const usdtExchangeRate = rawSettings && rawSettings.length > 0 ? rawSettings[0].usdtExchangeRate : 15.0;

    const activeBatchTrades = batchTrades.filter(t => t.status !== "REJECTED");
    const totalExpectedPayout = activeBatchTrades.reduce((sum, t) => sum + (t.calculatedPayout || 0), 0);
    const totalUsdtPayout = usdtExchangeRate > 0 ? (totalExpectedPayout / usdtExchangeRate) : 0;

    return (
        <div className="trade-details-container">
            <div className="trade-header-admin">
                <div className="header-info">
                    <h1 className="trade-title">
                        {isBatchTrade ? `Batch Workspace: ${batchIdentifier}` : `Trade Workspace: ${trade.tradeId}`}
                    </h1>
                    <p className="trade-subtitle">Review multiple cards, reject bad ones, and process batch payment.</p>
                </div>
            </div>

            {duplicateWarnings.length > 0 && (
                <div className="warning-card">
                    <h3 className="warning-title">
                        <span>⚠️</span> Security Warning: Duplicate Code Detected in System!
                    </h3>
                    <ul className="warning-list">
                        {duplicateWarnings.map(dw => (
                            <li key={dw.id}>
                                Card in {dw.tradeId} matches code hash in <a href={`/admin/trades/${dw.tradeId}`} className="underline">{dw.tradeId}</a> ({dw.status})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="trade-grid-admin chat-layout">
                {/* Left Column */}
                <div className="details-column">
                    {/* Itemized Cards List */}
                    <div className="card shadow-sm">
                        <div className="section-header">
                            <h2 className="section-title-main">Itemized Cards ({batchTrades.length})</h2>
                            <div className="payout-summary-link">
                                Total Batch Payout GH₵ <strong>{totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            </div>
                        </div>

                        <div className="batch-list">
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} className={`batch-item ${t.status === 'REJECTED' ? 'rejected' : ''}`}>
                                    <div className="batch-item-content">
                                        <div className="item-index">{idx + 1}</div>
                                        <div className="item-details">
                                            <div className="item-brand">{t.cardBrand}</div>
                                            <div className="item-meta">
                                                {t.cardType} • {t.faceValue} {t.currency} • <strong>Est. ₵{t.calculatedPayout?.toFixed(2)}</strong>
                                            </div>
                                            <div className="item-code-box">
                                                <code className="item-code">{t.cardCode || 'No code provided'}</code>
                                                <div className="code-copy">
                                                    <CopyButton textToCopy={t.cardCode} label="" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="batch-item-footer">
                                        <div className="status-info">
                                            <div className="status-label">Item Status</div>
                                            <div className={`status-value ${t.status === 'REJECTED' ? 'text-danger' : 'text-success'}`}>
                                                {t.status === 'REJECTED' ? 'REJECTED' : 'ACCEPTED'}
                                            </div>
                                        </div>

                                        <RejectCardButton
                                            tradeId={t.id}
                                            workspaceId={trade.id}
                                            currentStatus={t.status}
                                            pageTradeId={params.id}
                                            disabled={trade.status === 'PAID' || trade.status === 'COMPLETED'}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Batch Payout & Global Controls */}
                    <div className="card payout-controls sticky-payout">
                        <div className="payout-header-row">
                            <h3 className="section-title">Batch Payout Summary</h3>
                            <div className="payout-stats-box">
                                <div className="payout-stat">
                                    <small>TOTAL PAYOUT ({activeBatchTrades.length} accepted cards)</small>
                                    <div className="payout-ghs">
                                        GH₵ {totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                {trade.payoutMethod === "CRYPTO" && (
                                    <div className="payout-stat text-right">
                                        <small>APPROX. USDT</small>
                                        <div className="payout-usdt">
                                            ≈ {totalUsdtPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="payout-destination">
                                <small>DESTINATION: </small>
                                <strong className="dest-text">
                                    {trade.payoutMethod === "CRYPTO"
                                        ? `${trade.cryptoCoin} via ${trade.cryptoNetwork} (${trade.cryptoExchange})`
                                        : `${trade.payoutNetwork} - ${trade.payoutAccountName ? `${trade.payoutAccountName} - ` : ''}${trade.payoutPhoneNumber}`}
                                </strong>
                                <div className="dest-actions">
                                    {trade.payoutMethod !== "CRYPTO" && (
                                        <CopyButton textToCopy={trade.payoutPhoneNumber} label="Copy Phone Number" />
                                    )}
                                    {trade.payoutMethod === "CRYPTO" && trade.cryptoReceiverId && (
                                        <div className="crypto-id-row">
                                            <code className="crypto-code">{trade.cryptoReceiverId}</code>
                                            <CopyButton textToCopy={trade.cryptoReceiverId} label="Copy ID" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="controls-form">
                            <StatusControlsClient action={handleUpdateBatchStatus}>
                                <StatusSelector currentStatus={trade.status} />
                                <div className="form-group mb-0">
                                    <input name="paymentReference" className="form-input" placeholder="Payment Ref (e.g. Mobile Money ID)" />
                                </div>
                            </StatusControlsClient>
                        </div>
                    </div>

                    {/* Shared Images */}
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
                </div>

                {/* Right Column: Chat */}
                <div className="chat-column">
                    <h3 className="section-title">Batch Conversation</h3>
                    <div className="chat-container">
                        <ChatBox
                            tradeId={trade.id}
                            messages={messages}
                            currentUserId={currentUserId}
                            currentUsername="Admin"
                            path={`/admin/trades/${trade.tradeId}`}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
