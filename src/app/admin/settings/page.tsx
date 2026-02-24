import { prisma } from "@/lib/prisma";
import ClientSettingsForm from "./ClientSettingsForm";

export default async function AdminSettingsPage() {
    const settings = await prisma.settings.findFirst();

    return (
        <>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Site Settings</h1>
                <p className="dashboard-subtitle">Update public-facing copy and contact methods.</p>
            </div>

            <div className="card" style={{ maxWidth: "800px" }}>
                <ClientSettingsForm settings={settings} />
            </div>
        </>
    );
}
