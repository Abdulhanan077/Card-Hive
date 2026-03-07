
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Try to add the column if it doesn't exist
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Trade' AND column_name='batchId') THEN
                    ALTER TABLE "Trade" ADD COLUMN "batchId" TEXT;
                END IF;
            END $$;
        `);
        return NextResponse.json({ message: "Database schema update attempted (batchId added if missing)" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
