import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const links = await (prisma as any).balanceCheckerLink.findMany({
            orderBy: { brandName: 'asc' }
        });
        return NextResponse.json({ success: true, data: links });
    } catch (error) {
        console.error("Failed to fetch balance checker links:", error);
        return NextResponse.json({ success: false, message: "Failed to fetch links" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    try {
        const { brandName, url, isActive } = await req.json();

        if (!brandName || !url) {
            return NextResponse.json({ success: false, message: "Brand name and URL are required" }, { status: 400 });
        }

        const newLink = await (prisma as any).balanceCheckerLink.create({
            data: { brandName, url, isActive: isActive !== false }
        });

        return NextResponse.json({ success: true, data: newLink });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ success: false, message: "Brand name already exists" }, { status: 400 });
        }
        console.error("Failed to default balance checker link:", error);
        return NextResponse.json({ success: false, message: "Failed to add link" }, { status: 500 });
    }
}
