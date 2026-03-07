import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SuccessPage(props: {
    searchParams: Promise<{ tradeId: string }>;
}) {
    const searchParams = await props.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");

    const tradeId = searchParams.tradeId;
    const trade = await prisma.trade.findUnique({
        where: { tradeId }
    });

    if (!trade || trade.userId !== parseInt(session.user.id)) {
        redirect("/user");
    }

    let batchTrades = [trade];
    if (trade.fullName && trade.fullName.startsWith('BATCH-')) {
        batchTrades = await prisma.trade.findMany({
            where: { fullName: trade.fullName }
        });
    }

    const totalValue = batchTrades.reduce((sum, t) => sum + t.faceValue, 0);
    const brands = Array.from(new Set(batchTrades.map(t => t.cardBrand))).join(', ');
    const isBatch = batchTrades.length > 1;

    return (
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
            <h1 className="dashboard-title">Trade Submitted Successfully!</h1>
            <p className="dashboard-subtitle" style={{ marginBottom: '2.5rem', fontSize: '1.1rem' }}>
                Your {isBatch ? `${batchTrades.length} gift cards have` : 'gift card has'} been securely logged and {isBatch ? 'are' : 'is'} now <strong>Pending Review</strong>.
            </p>

            <div className="card" style={{ textAlign: 'left', marginBottom: '3rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    {isBatch ? 'Batch Summary' : 'Trade Summary'}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>Reference ID</span>
                        <strong style={{ color: 'var(--primary)' }}>{isBatch ? trade.fullName : trade.tradeId}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>{isBatch ? 'Cards Included' : 'Card Details'}</span>
                        <strong>{isBatch ? `${batchTrades.length} Cards (${brands})` : `${trade.cardBrand} - ${trade.faceValue} ${trade.currency}`}</strong>
                    </div>
                    {isBatch && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ opacity: 0.7 }}>Total Face Value</span>
                            <strong>{totalValue} {trade.currency}</strong>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>Payout Method</span>
                        <strong>
                            {trade.payoutMethod === 'CRYPTO'
                                ? `Crypto: ${trade.cryptoCoin} (${trade.cryptoNetwork})`
                                : `${trade.payoutNetwork} (${trade.payoutPhoneNumber})`}
                        </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.7 }}>Status</span>
                        <span className="badge badge-pending">PENDING</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <Link href="/user/trades" className="btn btn-primary">
                    View My Trades
                </Link>
                <Link href="/user/sell" className="btn btn-secondary">
                    Submit Another
                </Link>
            </div>
        </div>
    );
}
