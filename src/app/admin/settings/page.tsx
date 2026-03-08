import { prisma } from "@/lib/prisma";
import ClientSettingsForm from "./ClientSettingsForm";
import Link from "next/link";

export default async function AdminSettingsPage() {
    const settings: any = await prisma.settings.findFirst();

    if (settings) {
        const rawSettings: any = await prisma.$queryRawUnsafe(`SELECT "cryptoServiceFee" FROM "Settings" WHERE id = ${settings.id} LIMIT 1`);
        if (rawSettings && rawSettings.length > 0) {
            settings.cryptoServiceFee = rawSettings[0].cryptoServiceFee;
        }
    }

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Site Settings</h1>
                <p className="dashboard-subtitle">Update public-facing copy and contact methods.</p>
            </div>

            <div className="card" style={{ maxWidth: "800px" }}>
                <ClientSettingsForm settings={settings} />
            </div>

            <div className="card" style={{ maxWidth: "800px", marginTop: "2rem", border: "1px solid var(--danger)", backgroundColor: "var(--surface)" }}>
                <h3 style={{ color: "var(--danger)", marginBottom: "0.5rem" }}>Advanced Storage Management</h3>
                <p style={{ fontSize: "0.9rem", color: "gray", marginBottom: "1rem" }}>Access the raw image database to view or delete old trade images. Images can only be deleted if they are older than 3 days.</p>
                <Link href="/admin/storage" className="btn" style={{ border: "1px solid var(--danger)", color: "var(--danger)", display: "inline-block" }}>
                    Manage All Images
                </Link>
            </div>
        </>
    );
}
