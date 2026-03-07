import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    const trades = await prisma.trade.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    return NextResponse.json(trades);
}
