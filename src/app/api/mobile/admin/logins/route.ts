import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobileAuth";

export async function GET(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const portal = searchParams.get("portal");
        const success = searchParams.get("success");
        const query = searchParams.get("query");

        const whereClause: any = {};

        if (portal && ["USER", "ADMIN"].includes(portal)) {
            whereClause.portal = portal;
        }

        if (success === 'true') {
            whereClause.success = true;
        } else if (success === 'false') {
            whereClause.success = false;
        }

        if (query) {
            whereClause.OR = [
                { emailOrUsername: { contains: query, mode: 'insensitive' } },
                { ipAddress: { contains: query } }
            ];
        }

        const logs = await prisma.loginEvent.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
                user: {
                    select: { username: true, email: true }
                }
            }
        });

        return NextResponse.json({ success: true, logs });

    } catch (error) {
        console.error("Admin Mobile Login Logs API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
