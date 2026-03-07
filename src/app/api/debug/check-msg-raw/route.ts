
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const raw = await prisma.$queryRaw<any[]>`
            SELECT id, "tradeId", "senderId", content, "fileUrl", "fileType", "createdAt"
            FROM "Message"
            LIMIT 1
        `;
        if (raw.length === 0) return NextResponse.json({ error: "No messages found" });

        const first = raw[0];
        const keys = Object.keys(first);
        const types = {};
        keys.forEach(k => types[k] = typeof first[k]);

        return NextResponse.json({
            sample: first,
            keys,
            types,
            rawJson: JSON.stringify(first)
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
