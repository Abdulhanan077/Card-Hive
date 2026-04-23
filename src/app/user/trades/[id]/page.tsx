import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import TradeChatToggle from "@/app/components/TradeChatToggle";
import Link from "next/link";
import "./trade-details.css";
import SafeImage from "@/app/components/SafeImage";
import ConfirmReceiptButton from "@/app/components/ConfirmReceiptButton";
import CopyButton from "@/app/components/CopyButton";

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
            {/* Premium Header Section */}
            <div className="trade-header-premium">
                <div className="header-top">
                    <Link href="/user/trades" className="btn-back-modern">
                        <svg className="icon-sm" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Trades
                    </Link>
                    <div className="trade-id-pill">
                        ID: {trade.tradeId}
                    </div>
                </div>
                
                <div className="header-main">
                    <div className="title-group">
                        <h1 className="trade-title-xl">
                            {trade.fullName && trade.fullName.startsWith('BATCH-') ? (
                                <>Batch Trade <span className="text-gradient">{trade.fullName.split('-')[1]}</span></>
                            ) : (
                                <>Card Trade <span className="text-gradient">#{trade.tradeId.slice(-6)}</span></>
                            )}
                        </h1>
                        <p className="trade-timestamp">
                            <svg className="icon-xs" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Submitted on {new Date(trade.createdAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
                        </p>
                    </div>
                    
                    <div className={`status-banner banner-${trade.status.toLowerCase()}`}>
                        <div className="status-dot"></div>
                        {trade.status.replace("_", " ")}
                    </div>
                </div>
            </div>

            <div className="trade-grid-modern">
                {/* Main Content Column */}
                <div className="details-stack">
                    
                    {/* 1. Card Details Section */}
                    <section className="glass-card">
                        <div className="card-header">
                            <div className="header-icon-box">
                                <svg className="icon-md" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="section-heading">
                                {batchTrades.length > 1 ? `Batch Items (${batchTrades.length})` : 'Gift Card Asset'}
                            </h3>
                        </div>

                        <div className="batch-modern-list">
                            {batchTrades.map((t: any, idx) => (
                                <div key={t.id} className={`batch-modern-item ${t.id === trade.id ? 'highlight' : ''}`}>
                                    <div className="item-meta-top">
                                        <span className="item-index-tag">Item #{idx + 1}</span>
                                        <span className={`status-pill status-${t.status.toLowerCase()}`}>
                                            {t.status.replace("_", " ")}
                                        </span>
                                    </div>
                                    
                                    <div className="item-content-body">
                                        <div className="item-brand-display">
                                            <div className="brand-logo-placeholder">
                                                <svg className="icon-sm" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <div className="brand-info">
                                                <h4>{t.cardBrand}</h4>
                                                <span>{t.cardType} • {t.cardCountry}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="item-value-box">
                                            <div className="value-label">Face Value</div>
                                            <div className="value-amount">{t.faceValue} {t.currency}</div>
                                        </div>
                                    </div>

                                    <div className="item-footer-payout">
                                        <span className="payout-label">Payout Amount</span>
                                        <span className="payout-value">GH₵ {t.calculatedPayout?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {batchTrades.length > 1 && (
                            <div className="summary-payout-box">
                                <div className="summary-details">
                                    <span className="summary-label">Total Estimated Payout</span>
                                    <span className="summary-hint">(Excludes any rejected items)</span>
                                </div>
                                <div className="summary-value">
                                    GH₵ {batchTrades.reduce((sum: number, t: any) => sum + (t.status !== 'REJECTED' ? (t.calculatedPayout || 0) : 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 2. Payout Destination Section */}
                    <section className="glass-card">
                        <div className="card-header">
                            <div className="header-icon-box purple">
                                <svg className="icon-md" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="section-heading">Payout Destination</h3>
                        </div>

                        <div className="payout-modern-content">
                            {trade.payoutMethod === 'CRYPTO' ? (
                                <div className="crypto-display">
                                    <div className="crypto-badge">
                                        <div className="crypto-icon">₿</div>
                                        <div className="crypto-name">
                                            <strong>{trade.cryptoCoin}</strong>
                                            <span>{trade.cryptoNetwork}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="payout-detail-row">
                                        <span className="detail-label">Exchange Platform</span>
                                        <span className="detail-value">{trade.cryptoExchange}</span>
                                    </div>

                                    <div className="id-container-modern">
                                        <div className="id-label-modern">
                                            {trade.cryptoReceiverIdType === 'WALLET_ADDRESS' ? 'Destination Wallet Address' : 'Platform Exchange ID'}
                                        </div>
                                        <div className="id-value-modern">
                                            <code>{trade.cryptoReceiverId}</code>
                                            <CopyButton text={trade.cryptoReceiverId} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="momo-display">
                                    <div className="momo-header">
                                        <div className="momo-network-logo">
                                            <svg className="icon-sm" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="momo-title">
                                            <strong>{trade.payoutNetwork}</strong>
                                            <span>Mobile Money Payout</span>
                                        </div>
                                    </div>
                                    
                                    <div className="momo-grid">
                                        <div className="momo-field">
                                            <span className="momo-label">Account Name</span>
                                            <span className="momo-value">{trade.payoutAccountName || 'N/A'}</span>
                                        </div>
                                        <div className="momo-field">
                                            <span className="momo-label">Phone Number</span>
                                            <span className="momo-value highlight">{trade.payoutPhoneNumber}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 3. Proof of Assets Section */}
                    {parsedImages.length > 0 && (
                        <section className="glass-card">
                            <div className="card-header">
                                <div className="header-icon-box green">
                                    <svg className="icon-md" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="section-heading">Uploaded Verification Proof</h3>
                            </div>
                            
                            <div className="proof-modern-grid">
                                {parsedImages.map((src, idx) => (
                                     <div key={idx} className="proof-thumb">
                                         <SafeImage src={src} alt="proof" className="img-fit" useLink={true} />
                                     </div>
                                 ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Floating Chat System */}
            <TradeChatToggle
                tradeId={trade.id}
                initialMessages={messages}
                currentUserId={currentUserId}
                currentUsername={session.user.name || "User"}
                path={`/user/trades/${trade.tradeId}`}
            />
        </div>
    );
}
