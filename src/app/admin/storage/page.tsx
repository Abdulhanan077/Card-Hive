import { getStorageImages } from "./actions";
import ImageGrid from "./ImageGrid";

export default async function AdminStoragePage() {
    const images = await getStorageImages();

    // Sort newest first
    const sortedImages = images.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "2rem" }}>
            <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
                <h1 className="dashboard-title">Storage Management</h1>
                <p className="dashboard-subtitle">View and manage uploaded images taking up space across Vercel Blob and Cloudflare R2.</p>
            </div>

            <ImageGrid initialImages={sortedImages} />
        </div>
    );
}
