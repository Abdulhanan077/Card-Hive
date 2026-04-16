import { NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/mobileAuth";
import { list as listVercel, del as delVercel } from "@vercel/blob";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

async function listAllImages() {
    let allImages: any[] = [];

    // 1. Fetch from Vercel
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
            const { blobs } = await listVercel();
            const vercelImages = blobs.map((blob) => ({
                url: blob.url,
                pathname: blob.pathname,
                size: blob.size,
                uploadedAt: blob.uploadedAt.toISOString(),
            }));
            allImages = [...allImages, ...vercelImages];
        } catch (e) { console.error("Error fetching Vercel Blobs", e) }
    }

    // 2. Fetch from Cloudflare R2
    try {
        const command = new ListObjectsV2Command({
            Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        });
        const r2Data = await s3Client.send(command);

        if (r2Data.Contents) {
            const r2Images = r2Data.Contents.map((obj) => ({
                url: `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${obj.Key}`,
                pathname: obj.Key || "",
                size: obj.Size || 0,
                uploadedAt: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
            }));
            allImages = [...allImages, ...r2Images];
        }
    } catch (e) { console.error("Error fetching R2 Blobs", e) }

    return allImages;
}

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

        const images = await listAllImages();
        
        return NextResponse.json({ success: true, images });

    } catch (error) {
        console.error("Admin Mobile Storage API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get("Authorization")?.split(" ")[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const admin = await verifyMobileToken(token);
        if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

        const { urls } = await request.json();
        if (!urls || urls.length === 0) {
            return NextResponse.json({ error: "No images selected" }, { status: 400 });
        }

        const allSystemBlobs = await listAllImages();
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const validUrlsToDelete = urls.filter((url: string) => {
            const blob = allSystemBlobs.find(b => b.url === url);
            if (!blob) return false;
            return new Date(blob.uploadedAt) <= threeDaysAgo;
        });

        if (validUrlsToDelete.length === 0) {
            return NextResponse.json({ success: false, error: "None of the selected images are 3 days old yet. Deletion rejected." });
        }

        // Vercel and R2 split
        const vercelUrls = validUrlsToDelete.filter((url: string) => url.includes("public.blob.vercel-storage.com"));
        const r2Urls = validUrlsToDelete.filter((url: string) => url.includes(process.env.CLOUDFLARE_R2_PUBLIC_URL || ""));

        if (vercelUrls.length > 0) {
            await delVercel(vercelUrls);
        }

        if (r2Urls.length > 0) {
            const objectsToDelete = r2Urls.map((url: string) => {
                const key = url.replace(`${process.env.CLOUDFLARE_R2_PUBLIC_URL}/`, "");
                return { Key: key };
            });

            const deleteCommand = new DeleteObjectsCommand({
                Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
                Delete: { Objects: objectsToDelete, Quiet: false },
            });
            await s3Client.send(deleteCommand);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Admin Mobile Storage Action Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
