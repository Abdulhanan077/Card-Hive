import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import ChatBox from "@/app/components/ChatBox";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CopyButton from "@/components/CopyButton";
import { calculateVipTier } from "@/lib/vipTiers";

export default async function TradeDetailView(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const trade = await prisma.trade.findUnique({
        where: { tradeId: params.id },
        include: {
            user: true,
            messages: {
                include: { sender: true },
                orderBy: { createdAt: "asc" }
            }
        }
    });

    if (!trade) {
        return notFound();
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return redirect("/login");
    const currentUserId = parseInt(session.user.id);

    // Duplicate explicit check
    const duplicateWarnings = await prisma.trade.findMany({
        where: {
            cardCodeHash: trade.cardCodeHash,
            id: { not: trade.id }
        }
    });

    const parsedImages: string[] = JSON.parse(trade.imageUrls || "[]");

    async function updateStatusAction(formData: FormData) {
        "use server";
        if (!trade) return;

        const status = formData.get("status") as string;
        const paymentReference = formData.get("paymentReference") as string;
        const adminNotes = formData.get("adminNotes") as string;

        const data: any = { status, adminNotes };

        if (status === "PAID" && trade!.status !== "PAID") {
            data.paymentReference = paymentReference;
            data.paidAt = new Date();

            // Reward System Logic has been moved to the Customer "Confirm Receipt" Action

        } else if (status !== "PAID" && status !== "COMPLETED") {
            data.paymentReference = null;
            data.paidAt = null;
        }

        await prisma.trade.update({
            where: { id: trade!.id },
            data
        });

        revalidatePath(`/admin/trades/${params.id}`);
        revalidatePath(`/admin/trades`);
        revalidatePath(`/admin`);
    }

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Trade Workspace: {trade.tradeId}</h1>
                <p className="dashboard-subtitle">Review payload, check security warnings, process payment, and chat with the seller.</p>
            </div>

            {duplicateWarnings.length > 0 && (
                <div style={{ backgroundColor: "#fef2f2", color: "var(--danger)", padding: "1.5rem", borderRadius: "var(--radius-md)", border: "1px solid #fca5a5", marginBottom: "2rem" }}>
                    <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span>⚠️</span> Security Warning: Duplicate Hash Detected!
                    </h3>
                    <p style={{ marginTop: "0.5rem" }}>
                        The exact card code hash for this trade is shared with {duplicateWarnings.length} other trade(s) in the system.
                    </p>
                    <ul style={{ marginTop: "1rem", paddingLeft: "1.5rem" }}>
                        {duplicateWarnings.map(dw => (
                            <li key={dw.id}>
                                <a href={`/admin/trades/${dw.tradeId}`} style={{ textDecoration: "underline", fontWeight: 600 }}>
                                    {dw.tradeId}
                                </a>
                                {" "} - Status: <span className={`badge badge-${dw.status.toLowerCase()}`}>{dw.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-2 chat-layout" style={{ gap: "2rem", alignItems: "start", height: "calc(100vh - 200px)", minHeight: "800px" }}>

                {/* Left Column: Details & Controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto", paddingRight: "1rem" }}>

                    {/* Controls & Payout Info */}
                    <div className="card" style={{ borderColor: 'var(--primary)', position: "sticky", top: 0, zIndex: 10 }}>
                        <div style={{ marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
                            <h3 style={{ marginBottom: "1rem" }}>Submitter & Payout Info</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                                <div><small>Username</small><div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>@{trade.user.username}</div></div>
                                <div><small>Account Email</small><div style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{trade.user.email}</div></div>
                                <div style={{ gridColumn: "1 / -1", backgroundColor: "var(--primary-light)", padding: "1rem", borderRadius: "var(--radius-md)", marginTop: "0.5rem" }}>
                                    <small style={{ color: "var(--primary-hover)", fontWeight: 600, textTransform: "uppercase" }}>PAYOUT DESTINATION</small>
                                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--foreground)", display: "flex", alignItems: "center" }}>
                                        {trade.payoutNetwork} - {trade.payoutPhoneNumber}
                                        <CopyButton textToCopy={`${trade.payoutNetwork} - ${trade.payoutPhoneNumber}`} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ margin: 0 }}>Status Controls</h3>
                            <span className={`badge badge-${trade.status.toLowerCase()}`} style={{ fontSize: "1rem", padding: "0.5rem 1rem" }}>
                                {trade.status.replace("_", " ")}
                            </span>
                        </div>

                        <form action={updateStatusAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <select name="status" className="form-select" defaultValue={trade.status} style={{ padding: "0.5rem" }}>
                                    <option value="PENDING">Pending (Initial)</option>
                                    <option value="UNDER_REVIEW">Under Review</option>
                                    <option value="PAID">Paid (Awaiting User Confirm)</option>
                                    <option value="COMPLETED" disabled>Completed (Confirmed by User)</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <input
                                    type="text"
                                    name="paymentReference"
                                    className="form-input"
                                    defaultValue={trade.paymentReference || ""}
                                    placeholder="Payment Ref (Required if Paid)"
                                    style={{ padding: "0.5rem" }}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem" }}>Update Trade</button>
                        </form>
                    </div>

                    {/* Card Info */}
                    <div className="card">
                        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", color: "var(--primary)" }}>
                            Card Information
                        </h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                            <div><small>Brand</small><div style={{ fontWeight: 600 }}>{trade.cardBrand}</div></div>
                            <div>
                                <small>Value</small>
                                <div style={{ fontWeight: 600 }}>{trade.faceValue} {trade.currency}</div>
                            </div>

                            {trade.calculatedPayout && (
                                <div style={{ gridColumn: "1 / -1", backgroundColor: "var(--bg-alt)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                                    <small>SYSTEM CALCULATED PAYOUT</small>
                                    <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--primary)" }}>
                                        GH₵ {trade.calculatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            )}

                            <div><small>Type</small><div>{trade.cardType}</div></div>
                            <div><small>Region</small><div>{trade.cardCountry}</div></div>

                            <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", backgroundColor: "var(--surface-hover)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                                <small style={{ color: "var(--danger)", fontWeight: 700 }}>SECURE DATA (RAW CODE)</small>
                                <div style={{ marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <strong>Code / PIN:</strong>
                                        <span style={{ fontFamily: "monospace", letterSpacing: "0.05em", fontSize: "1.1em", marginLeft: "0.5rem", fontWeight: "bold" }}>{trade.cardCode}</span>
                                        <CopyButton textToCopy={trade.cardCode} />
                                    </div>
                                    {trade.serialNumber && (
                                        <div style={{ display: "flex", alignItems: "center" }}>
                                            <strong>Serial Number:</strong>
                                            <span style={{ fontFamily: "monospace", marginLeft: "0.5rem", fontWeight: "bold" }}>{trade.serialNumber}</span>
                                            <CopyButton textToCopy={trade.serialNumber} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Images */}
                    <div className="card">
                        <h3 style={{ marginBottom: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem" }}>
                            Uploaded Evidence
                        </h3>
                        {parsedImages.length === 0 ? (
                            <p style={{ opacity: 0.6 }}>No images uploaded.</p>
                        ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.5rem" }}>
                                {parsedImages.map((src, idx) => (
                                    <a key={idx} href={src} target="_blank" rel="noopener noreferrer" style={{ display: "block", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={src} alt={`Evidence ${idx + 1}`} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Interactive Chat Box */}
                <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <h3 style={{ marginBottom: "1rem" }}>Conversation Thread</h3>
                    <ChatBox
                        tradeId={trade.id}
                        messages={trade.messages}
                        currentUserId={currentUserId}
                        path={`/admin/trades/${trade.tradeId}`}
                    />
                </div>

            </div>
        </>
    );
}
