import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Force TS refresh


export async function GET() {
    try {
        const now = new Date();
        const updates = await prisma.statusUpdate.findMany({
            where: {
                expiresAt: {
                    gt: now,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ updates });
    } catch (error) {
        console.error("Error fetching status updates:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
