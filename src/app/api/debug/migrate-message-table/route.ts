import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    console.log("🚀 Starting direct SQL migration for Message table...");

    try {
        // Add fileUrl column
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
        `);
        console.log("✅ Column 'fileUrl' added successfully or already exists.");

        // Add fileType column
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "fileType" TEXT;
        `);
        console.log("✅ Column 'fileType' added successfully or already exists.");
        +
            +        // Add isEdited column
            +        await prisma.$executeRawUnsafe(`
+            ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT FALSE;
+        `);
        +        console.log("✅ Column 'isEdited' added successfully or already exists.");

        return NextResponse.json({ success: true, message: "Migration completed" });
    } catch (error: any) {
        console.error("❌ Migration failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
