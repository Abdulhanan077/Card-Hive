import { prisma } from "@/lib/prisma";
import ClientRatesManager from "./ClientRatesManager";

export default async function AdminRatesPage() {
    const rates = await prisma.cardRate.findMany({
        orderBy: { cardBrand: "asc" }
    });

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Manage Exchange Rates</h1>
                <p className="dashboard-subtitle">Configure dynamic payout multipliers based on card type and region.</p>
            </div>

            <ClientRatesManager initialRates={rates} />
        </>
    );
}
