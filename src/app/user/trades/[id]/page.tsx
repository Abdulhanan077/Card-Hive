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
            messages: {
                include: { sender: true },
                orderBy: { createdAt: "asc" }
            }
        }
    });

    if (!trade) {
        return notFound();
    }

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

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1rem" }}>

            <div style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <Link href="/user/trades" className="btn btn-outline" style={{ padding: "0.5rem 1rem" }}>
                    &larr; Back
                </Link>
                <div>
                    <h1 className="dashboard-title" style={{ margin: 0 }}>Trade: {trade.tradeId}</h1>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <div className="card">
                        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                            Gift Card Details
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ opacity: 0.8 }}>Brand</span>
                                <strong>{trade.cardBrand}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ opacity: 0.8 }}>Value</span>
                                <strong>{trade.faceValue} {trade.currency}</strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ opacity: 0.8 }}>Type</span>
                                <span>{trade.cardType}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ opacity: 0.8 }}>Region</span>
                                <span>{trade.cardCountry}</span>
                            </div>

                            {trade.calculatedPayout && (
                                <div style={{ marginTop: "1rem", backgroundColor: "var(--bg-alt)", padding: "1rem", borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Estimated Payout</span>
                                    <strong style={{ fontSize: "1.25rem", color: "var(--primary)", marginTop: "0.25rem" }}>
                                        GH₵ {trade.calculatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </strong>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="card" style={{ flex: 1 }}>
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
                                {(trade.cryptoTxHash || trade.cryptoTxNote) && (
                                    <div style={{ marginTop: "1rem", borderTop: "1px dashed var(--border)", paddingTop: "0.75rem" }}>
                                        {trade.cryptoTxHash && (
                                            <div style={{ marginBottom: "0.5rem" }}>
                                                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Transaction Reference:</div>
                                                <div style={{ fontSize: "0.85rem", fontWeight: "bold", wordBreak: "break-all" }}>{trade.cryptoTxHash}</div>
                                            </div>
                                        )}
                                        {trade.cryptoTxNote && (
                                            <div>
                                                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Admin Note:</div>
                                                <div style={{ fontSize: "0.85rem", fontStyle: "italic" }}>{trade.cryptoTxNote}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{trade.payoutNetwork}</div>
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
                        messages={trade.messages as any}
                        currentUserId={currentUserId}
                        currentUsername={session.user.name || "User"}
                        path={`/user/trades/${trade.tradeId}`}
                    />
                </div>

            </div>

        </div>
    );
}
