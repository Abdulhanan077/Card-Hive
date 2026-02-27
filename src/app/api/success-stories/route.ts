import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const now = new Date();
        const stories = await prisma.successStory.findMany({
            where: {
                expiresAt: {
                    gt: now,
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({ stories });
    } catch (error) {
        console.error("Error fetching success stories:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
