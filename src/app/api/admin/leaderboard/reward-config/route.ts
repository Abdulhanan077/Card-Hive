import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const configs = await (prisma as any).leaderboardRewardConfig.findMany({
            orderBy: [{ type: 'asc' }, { boardType: 'asc' }]
        });
        return NextResponse.json({ success: true, data: configs });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, type, boardType, key, points, isActive, description } = body;

        if (id) {
            // Update by ID
            const updated = await (prisma as any).leaderboardRewardConfig.update({
                where: { id },
                data: { type, boardType, key, points, isActive, description }
            });
            return NextResponse.json({ success: true, data: updated });
        } else {
            // Find existing by composite key to prevent duplicates
            const existing = await (prisma as any).leaderboardRewardConfig.findFirst({
                where: { type, boardType, key }
            });

            if (existing) {
                const updated = await (prisma as any).leaderboardRewardConfig.update({
                    where: { id: existing.id },
                    data: { points, isActive, description }
                });
                return NextResponse.json({ success: true, data: updated });
            }

            // Create new
            const created = await (prisma as any).leaderboardRewardConfig.create({
                data: { type, boardType, key, points, isActive, description }
            });
            return NextResponse.json({ success: true, data: created });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = parseInt(searchParams.get("id") || "");

        if (!id) return NextResponse.json({ success: false, message: "Missing ID" }, { status: 400 });

        await (prisma as any).leaderboardRewardConfig.delete({ where: { id } });
        return NextResponse.json({ success: true, message: "Deleted config" });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
