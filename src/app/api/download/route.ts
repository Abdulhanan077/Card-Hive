import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const url = searchParams.get("url");
        const filename = searchParams.get("filename") || "download";

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Fetch the file from the external URL (bypassing browser CORS)
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch from external URL: ${response.status} ${response.statusText}`);
        }

        // Get the response array buffer
        const arrayBuffer = await response.arrayBuffer();

        // Construct standard headers for file download
        const headers = new Headers();
        headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error("Download proxy error:", error);
        return NextResponse.json({ error: "Failed to proxify download" }, { status: 500 });
    }
}
