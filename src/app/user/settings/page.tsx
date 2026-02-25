import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClientSettingsForm from "./ClientSettingsForm"; // We will create this

export default async function UserSettingsPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: parseInt(session.user.id) },
        select: {
            username: true,
            email: true,
            createdAt: true,
            referralCode: true,
            status: true,
            emailNotificationsEnabled: true
        }
    });

    if (!user) {
        redirect("/login");
    }

    // Format member since date
    const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="dashboard-title" style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span role="img" aria-label="user">👤</span> Profile Settings
                </h1>
            </div>

            <ClientSettingsForm
                user={{
                    username: user.username,
                    email: user.email,
                    memberSince: memberSince,
                    referralCode: user.referralCode || "N/A",
                    emailNotificationsEnabled: user.emailNotificationsEnabled
                }}
            />
        </div>
    );
}
