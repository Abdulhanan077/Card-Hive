import { prisma } from "@/lib/prisma";
import ClientRatesManager from "./ClientRatesManager";

export default async function AdminRatesPage() {
    // Use raw SQL to bypass Prisma Client's internal validation of fields
    const rates: any = await prisma.$queryRawUnsafe(`SELECT * FROM "CardRate" ORDER BY "cardBrand" ASC`);

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
