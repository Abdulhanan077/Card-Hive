import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { fileName, fileType } = await req.json();

        if (!fileName || !fileType) {
            return NextResponse.json({ message: "Missing file details" }, { status: 400 });
        }

        const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "")}`;
        
        const command = new PutObjectCommand({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
            Key: uniqueName,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;

        return NextResponse.json({ uploadUrl, publicUrl });
    } catch (error: any) {
        console.error("❌ Failed to generate presigned URL:", error);
        return NextResponse.json({ message: "Failed to generate upload link" }, { status: 500 });
    }
}
