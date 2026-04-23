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
import FloatingChatWrapper from "@/app/components/FloatingChatWrapper";

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


    // Unread message marking is handled by client components

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

    const userVip = calculateVipTier(trade.user.completedTradesCount || 0);

    return (
        <div className="trade-details-container">
            <div className="trade-header-admin">
                <div className="header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                            color: 'var(--primary)', 
                            padding: '0.4rem 0.75rem', 
                            borderRadius: '100px', 
                            fontSize: '0.75rem', 
                            fontWeight: 700,
                            letterSpacing: '0.05em'
                        }}>
                            TRADE WORKSPACE
                        </span>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#cbd5e1' }}></div>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }} suppressHydrationWarning>
                            {new Date(trade.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                    </div>
                    <h1 className="trade-title">
                        {isBatchTrade ? batchIdentifier : trade.tradeId}
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                {String(trade.user.username || 'U').trim().charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--foreground)' }}>@{trade.user.username}</span>
                        </div>
                        <span className="badge" style={{ backgroundColor: userVip.color, color: 'white', fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                            {userVip.name}
                        </span>
                    </div>
                </div>
            </div>

            {duplicateWarnings.length > 0 && (
                <div className="warning-card">
                    <h3 className="warning-title">
                        <span>🚨</span> Security Alert: Potential Duplicate Detected
                    </h3>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9 }}>This card code has been submitted previously in other trades. Please verify carefully.</p>
                    <ul className="warning-list" style={{ marginTop: '1rem' }}>
                        {duplicateWarnings.map(dw => (
                            <li key={dw.id} style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                                Match found in <a href={`/admin/trades/${dw.tradeId}`} className="underline" style={{ fontWeight: 600 }}>{dw.tradeId}</a> ({dw.status})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="trade-grid-admin">
                {/* Left Column */}
                <div className="details-column" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Shared Images - Moved to top for better visibility and to avoid sticky overlap */}
                    <div className="card">
                        <h3 className="section-title">🖼️ Proof of Ownership ({parsedImages.length})</h3>
                        <div className="image-grid">
                            {parsedImages.length === 0 ? (
                                <div style={{ 
                                    gridColumn: '1 / -1', 
                                    padding: '3rem', 
                                    textAlign: 'center', 
                                    background: 'var(--bg-alt)', 
                                    borderRadius: '16px',
                                    border: '2px dashed var(--border)',
                                    color: 'var(--text-muted)'
                                }}>
                                    No proof images uploaded.
                                </div>
                            ) : (
                                parsedImages.map((src, idx) => (
                                    <a key={idx} href={src} target="_blank" rel="noopener noreferrer" className="proof-link">
                                        <SafeImage src={src} alt="proof" className="proof-image" />
                                    </a>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Itemized Cards List */}
                    <div className="card">
                        <div className="section-header">
                            <h2 className="section-title-main">Itemized Cards ({batchTrades.length})</h2>
                            <div className="payout-summary-link" style={{ backgroundColor: 'var(--bg-alt)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 600, color: 'var(--foreground)' }}>
                                GH₵ {totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })} Total
                            </div>
                        </div>

                        <div className="batch-list">
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} className={`batch-item ${t.status === 'REJECTED' ? 'rejected' : ''}`}>
                                    <div className="batch-item-content">
                                        <div className="item-index">{idx + 1}</div>
                                        <div className="item-details">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div>
                                                    <div className="item-brand">{t.cardBrand}</div>
                                                    <div className="item-meta">
                                                        {t.cardType} • {t.faceValue} {t.currency}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: t.status === 'REJECTED' ? '#ef4444' : 'var(--primary)' }}>
                                                        ₵{t.calculatedPayout?.toFixed(2)}
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 700 }}>PAYOUT</div>
                                                </div>
                                            </div>
                                            
                                            <div className="item-code-box">
                                                <code className="item-code">{t.cardCode || 'No code provided'}</code>
                                                <CopyButton textToCopy={t.cardCode} label="" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="batch-item-footer">
                                        <div className="status-info">
                                            <div className="status-label">Item Status</div>
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.4rem',
                                                color: t.status === 'REJECTED' ? '#ef4444' : '#10b981',
                                                fontWeight: 800,
                                                fontSize: '0.9rem'
                                            }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
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
                    <div className="card sticky-payout">
                        <div className="payout-header-row">
                            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🧾 Settlement Summary
                            </h3>
                            <div className="payout-stats-box">
                                <div className="payout-stat">
                                    <small>Total Net Payout</small>
                                    <div className="payout-ghs">
                                        GH₵ {totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                {trade.payoutMethod === "CRYPTO" && (
                                    <div className="payout-stat">
                                        <small>Approximate Crypto Value</small>
                                        <div className="payout-usdt">
                                            ≈ {totalUsdtPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="payout-destination">
                                <small className="status-label">Payment Destination</small>
                                <div className="dest-text">
                                    {trade.payoutMethod === "CRYPTO" ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>₿</span>
                                            {trade.cryptoCoin} ({trade.cryptoNetwork})
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>📱</span>
                                            {trade.payoutNetwork} • {trade.payoutAccountName || 'Account'}
                                        </div>
                                    )}
                                </div>
                                <div className="dest-actions">
                                    {trade.payoutMethod !== "CRYPTO" ? (
                                        <div style={{ backgroundColor: 'var(--bg-alt)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>{trade.payoutPhoneNumber}</span>
                                            <CopyButton textToCopy={trade.payoutPhoneNumber} label="Copy" />
                                        </div>
                                    ) : (
                                        <div className="crypto-id-row">
                                            <code className="crypto-code">{trade.cryptoReceiverId}</code>
                                            <CopyButton textToCopy={trade.cryptoReceiverId} label="Copy" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="controls-form">
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="status-label">Update Overall Trade Status</label>
                            </div>
                            <StatusControlsClient action={handleUpdateBatchStatus}>
                                <StatusSelector currentStatus={trade.status} />
                                <div className="form-group mb-0">
                                    <input 
                                        name="paymentReference" 
                                        className="form-input" 
                                        placeholder="Payment Reference / Transaction ID" 
                                        style={{ height: '48px', borderRadius: '12px' }}
                                    />
                                </div>
                            </StatusControlsClient>
                        </div>
                    </div>
                </div>
            </div>

            <FloatingChatWrapper
                tradeId={trade.id}
                messages={messages}
                currentUserId={currentUserId}
                currentUsername="Admin"
                path={`/admin/trades/${trade.tradeId}`}
            />
        </div>
    );
}
