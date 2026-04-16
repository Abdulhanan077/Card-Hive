import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
        }

        const { uploadToR2 } = await import("@/lib/upload");
        const buffer = await file.arrayBuffer();
        const url = await uploadToR2(buffer, file.name, file.type);

        return NextResponse.json({ 
            success: true, 
            url, 
            type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE' 
        });
    } catch (error) {
        console.error("Mobile Chat Upload Error:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
