import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: "auto",
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
});

/**
 * Uploads a file (File, Buffer, or Blob) to Cloudflare R2.
 * @param file The file data to upload.
 * @param fileName Original filename or specific name for the key.
 * @param contentType The MIME type of the file.
 * @returns The public URL of the uploaded file.
 */
export async function uploadToR2(file: Buffer | ArrayBuffer, fileName: string, contentType: string): Promise<string> {
    const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "")}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: uniqueName,
        Body: Buffer.isBuffer(file) ? file : Buffer.from(file as ArrayBuffer),
        ContentType: contentType,
    }));

    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;
    return publicUrl;
}

/**
 * Generates a presigned URL for direct client-side upload to R2.
 */
export async function getR2PresignedUrl(fileName: string, contentType: string) {
    const uniqueName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.]/g, "")}`;
    const command = new PutObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
        Key: uniqueName,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueName}`;

    return { uploadUrl, publicUrl, key: uniqueName };
}
