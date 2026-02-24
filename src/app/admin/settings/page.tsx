import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export default async function AdminSettingsPage() {
    const settings = await prisma.settings.findFirst();

    async function saveSettings(formData: FormData) {
        "use server";

        const data: any = {};

        const fields = ["siteName", "contactEmail", "whatsappNumber", "landingPageIntroText"];
        fields.forEach(field => {
            const val = formData.get(field);
            if (val !== null) {
                data[field] = val as string;
            }
        });


        const refBonusStr = formData.get("referralBonusPercentage") as string;
        if (refBonusStr) {
            data.referralBonusPercentage = parseFloat(refBonusStr);
        }

        const rewardPtsGhsStr = formData.get("rewardPointsToGhs") as string;
        if (rewardPtsGhsStr) {
            data.rewardPointsToGhs = parseFloat(rewardPtsGhsStr);
        }

        const existingSettings = await prisma.settings.findFirst();

        if (existingSettings) {
            await prisma.settings.update({
                where: { id: existingSettings.id },
                data
            });
        } else {
            await prisma.settings.create({ data });
        }

        revalidatePath("/admin/settings");
        revalidatePath("/");
    }

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Site Settings</h1>
                <p className="dashboard-subtitle">Update public-facing copy and contact methods.</p>
            </div>

            <div className="card" style={{ maxWidth: "800px" }}>
                <form action={saveSettings} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                    <div className="form-group">
                        <label className="form-label">Site Name</label>
                        <input
                            type="text"
                            name="siteName"
                            className="form-input"
                            defaultValue={settings?.siteName || "Card Hive Trading Center"}
                            required
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                        <div className="form-group">
                            <label className="form-label">Support Email</label>
                            <input
                                type="email"
                                name="contactEmail"
                                className="form-input"
                                defaultValue={settings?.contactEmail || "support@omorbiggy.com"}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">WhatsApp Number</label>
                            <input
                                type="text"
                                name="whatsappNumber"
                                className="form-input"
                                defaultValue={settings?.whatsappNumber || "+233 55 123 4567"}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "1rem" }}>
                        <label className="form-label" style={{ color: "var(--warning)", fontWeight: 600 }}>Referral Bonus Percentage (%)</label>
                        <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>The percentage of a referred user's first trade value that is awarded to the referrer as Reward Points.</p>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            name="referralBonusPercentage"
                            className="form-input"
                            defaultValue={settings?.referralBonusPercentage || 1.5}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: "1rem" }}>
                        <label className="form-label" style={{ color: "var(--success)", fontWeight: 600 }}>100 Points to Cedis Value (GHS)</label>
                        <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "0.5rem" }}>Determine the Cedi payout value equivalent of every 100 Reward Points.</p>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            name="rewardPointsToGhs"
                            className="form-input"
                            defaultValue={settings?.rewardPointsToGhs ?? 100.0}
                            required
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 2rem" }}>
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}
