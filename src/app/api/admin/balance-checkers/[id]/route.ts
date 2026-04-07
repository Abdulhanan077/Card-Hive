import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        const { brandName, url, isActive } = await req.json();

        const updated = await (prisma as any).balanceCheckerLink.update({
            where: { id },
            data: { brandName, url, isActive }
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ success: false, message: "Brand name already exists" }, { status: 400 });
        }
        console.error("Failed to update link:", error);
        return NextResponse.json({ success: false, message: "Failed to update link" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPERADMIN") {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    try {
        const resolvedParams = await params;
        const id = parseInt(resolvedParams.id);
        await (prisma as any).balanceCheckerLink.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete link:", error);
        return NextResponse.json({ success: false, message: "Failed to delete link" }, { status: 500 });
    }
}
