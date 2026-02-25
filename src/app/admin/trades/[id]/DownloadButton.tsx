"use client";

import React, { useState } from "react";

export default function DownloadButton({ src, fileName }: { src: string; fileName: string }) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download image. It may be due to CORS restrictions. Please right-click the image and 'Save Image As...'");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn btn-secondary"
            style={{ width: "100%", padding: "0.4rem", fontSize: "0.85rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
        >
            {isDownloading ? "Downloading..." : (
                <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Save
                </>
            )}
        </button>
    );
}
