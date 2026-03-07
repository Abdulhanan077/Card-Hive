import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import ChatBox from "@/app/components/ChatBox";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CopyButton from "@/components/CopyButton";
import { calculateVipTier } from "@/lib/vipTiers";
import DownloadButton from "./DownloadButton";
import ResendEmailButtons from "./ResendEmailButtons";
import SafeImage from "@/app/components/SafeImage";
import StatusControlsClient from "./StatusControlsClient";
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
    const usdtRate = rawSettings && rawSettings.length > 0 ? rawSettings[0].usdtExchangeRate : 15.0;

    const activeBatchTrades = batchTrades.filter(t => t.status !== "REJECTED");
    const totalExpectedPayout = activeBatchTrades.reduce((sum, t) => sum + (t.calculatedPayout || 0), 0);

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">
                    {isBatchTrade ? `Batch Workspace: ${batchIdentifier}` : `Trade Workspace: ${trade.tradeId}`}
                </h1>
                <p className="dashboard-subtitle">Review multiple cards, reject bad ones, and process batch payment.</p>
            </div>

            {duplicateWarnings.length > 0 && (
                <div style={{ backgroundColor: "#fef2f2", color: "var(--danger)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid #fca5a5", marginBottom: "2rem" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>⚠️</span> Security Warning: Duplicate Code Detected in System!
                    </h3>
                    <ul style={{ marginTop: "1rem" }}>
                        {duplicateWarnings.map(dw => (
                            <li key={dw.id}>
                                Card in {dw.tradeId} matches code hash in <a href={`/admin/trades/${dw.tradeId}`} className="underline">{dw.tradeId}</a> ({dw.status})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 chat-layout" style={{ gap: "2rem", alignItems: "start", height: "calc(100vh - 200px)", minHeight: "800px" }}>

                {/* Left Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "1rem" }}>

                    {/* Itemized Cards List */}
                    <div className="card shadow-sm">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <h2 style={{ margin: 0 }}>Itemized Cards ({batchTrades.length})</h2>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                                Total Batch Payout GH₵ <strong>{totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    padding: '1.25rem',
                                    backgroundColor: t.status === 'REJECTED' ? '#fef2f2' : 'var(--bg-alt)',
                                    borderRadius: 'var(--radius-md)',
                                    border: t.status === 'REJECTED' ? '2px solid #ef4444' : '1px solid var(--border)',
                                    opacity: 1
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', opacity: 0.3, marginTop: '2px' }}>{idx + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary)' }}>{t.cardBrand}</div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '2px' }}>
                                                {t.cardType} • {t.faceValue} {t.currency} • <strong>Est. ₵{t.calculatedPayout?.toFixed(2)}</strong>
                                            </div>
                                            <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', backgroundColor: 'var(--bg)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <code style={{ wordBreak: 'break-all' }}>{t.cardCode || 'No code provided'}</code>
                                                <div style={{ flexShrink: 0 }}>
                                                    <CopyButton textToCopy={t.cardCode} label="" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingTop: '1rem',
                                        borderTop: '1px solid var(--border)',
                                        marginTop: '0.5rem'
                                    }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.5px' }}>Item Status</div>
                                            <div style={{ fontWeight: '700', fontSize: '0.9rem', color: t.status === 'REJECTED' ? '#ef4444' : 'var(--success)' }}>
                                                {t.status === 'REJECTED' ? 'REJECTED' : 'ACCEPTED'}
                                            </div>
                                        </div>

                                        <RejectCardButton
                                            tradeId={t.id}
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
                    <div className="card" style={{ borderColor: 'var(--primary)', position: "sticky", top: 0, zIndex: 10 }}>
                        <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
                            <h3 style={{ marginBottom: "1rem" }}>Batch Payout Summary</h3>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-alt)", padding: "1rem", borderRadius: "12px" }}>
                                <div>
                                    <small>TOTAL PAYOUT ({activeBatchTrades.length} accepted cards)</small>
                                    <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--primary)" }}>
                                        GH₵ {totalExpectedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                {trade.payoutMethod === "CRYPTO" && (
                                    <div style={{ textAlign: "right" }}>
                                        <small>APPROX. USDT</small>
                                        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#16a34a" }}>
                                            ≈ {(totalExpectedPayout / usdtRate).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: "1.5rem" }}>
                                <small>DESTINATION: </small>
                                <strong style={{ marginLeft: "0.5rem" }}>
                                    {trade.payoutMethod === "CRYPTO"
                                        ? `${trade.cryptoCoin} via ${trade.cryptoNetwork} (${trade.cryptoExchange})`
                                        : `${trade.payoutNetwork} - ${trade.payoutAccountName ? `${trade.payoutAccountName} - ` : ''}${trade.payoutPhoneNumber}`}
                                </strong>
                                {trade.payoutMethod !== "CRYPTO" && (
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                                        <CopyButton textToCopy={trade.payoutPhoneNumber} label="Copy Phone Number" />
                                    </div>
                                )}
                                {trade.payoutMethod === "CRYPTO" && trade.cryptoReceiverId && (
                                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
                                        <code style={{ flex: 1, backgroundColor: "var(--bg)", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}>{trade.cryptoReceiverId}</code>
                                        <CopyButton textToCopy={trade.cryptoReceiverId} label="Copy ID" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <StatusControlsClient action={handleUpdateBatchStatus}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <select name="status" className="form-select" defaultValue={trade.status}>
                                    <option value="PENDING">Pending (Initial)</option>
                                    <option value="UNDER_REVIEW">Under Review</option>
                                    <option value="PAID">Mark Accepted Cards as PAID</option>
                                    <option value="REJECTED" style={{ color: '#ef4444', fontWeight: 'bold' }}>Reject ENTIRE Batch (Careful!)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <input name="paymentReference" className="form-input" placeholder="Payment Ref (e.g. Mobile Money ID)" />
                            </div>
                        </StatusControlsClient>
                    </div>

                    {/* Shared Images */}
                    <div className="card">
                        <h3 style={{ marginBottom: "1rem" }}>Uploaded Proof (Shared)</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                            {parsedImages.map((src, idx) => (
                                <a key={idx} href={src} target="_blank" rel="noopener noreferrer">
                                    <SafeImage src={src} alt="proof" style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "8px" }} />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Chat */}
                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Batch Conversation</h3>
                    <ChatBox
                        tradeId={trade.id}
                        messages={messages}
                        currentUserId={currentUserId}
                        currentUsername="Admin"
                        path={`/admin/trades/${trade.tradeId}`}
                    />
                </div>
            </div>
        </>
    );
}
