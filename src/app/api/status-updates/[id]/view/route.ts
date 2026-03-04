import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rawId } = await params;
        const id = parseInt(rawId);

        if (isNaN(id)) {
            return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
        }

        const update = await prisma.statusUpdate.update({
            where: { id },
            data: {
                views: {
                    increment: 1,
                },
            },
        });

        return NextResponse.json({ views: update.views });
    } catch (error) {
        console.error("Error updating view count:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
