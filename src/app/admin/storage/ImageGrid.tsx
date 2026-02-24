"use client";

import { useState } from "react";
import Image from "next/image";
import { deleteStorageImages } from "./actions";

type BlobImage = {
    url: string;
    pathname: string;
    size: number;
    uploadedAt: string;
};

export default function ImageGrid({ initialImages }: { initialImages: BlobImage[] }) {
    const [images, setImages] = useState(initialImages);
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Calculate total size
    const totalBytes = images.reduce((acc, img) => acc + img.size, 0);
    const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

    const toggleSelection = (url: string) => {
        const newSet = new Set(selectedUrls);
        if (newSet.has(url)) {
            newSet.delete(url);
        } else {
            newSet.add(url);
        }
        setSelectedUrls(newSet);
    };

    const selectAll = () => {
        if (selectedUrls.size === images.length) {
            setSelectedUrls(new Set());
        } else {
            setSelectedUrls(new Set(images.map(img => img.url)));
        }
    };

    const handleDelete = async () => {
        if (selectedUrls.size === 0) return;

        const confirmDelete = window.confirm(`Are you sure you want to permanently delete ${selectedUrls.size} images? This action cannot be undone and may break existing Trade History views that reference these images.`);
        if (!confirmDelete) return;

        setIsDeleting(true);
        const urlsToDelete = Array.from(selectedUrls);

        try {
            const res = await deleteStorageImages(urlsToDelete);
            if (res.success) {
                setImages(images.filter(img => !selectedUrls.has(img.url)));
                setSelectedUrls(new Set());
            } else {
                alert("Failed to delete some images.");
            }
        } catch (error) {
            alert("An error occurred while deleting images.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Storage Stats Banner */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--surface)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
                <div>
                    <h2 style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>Vercel Blob Storage</h2>
                    <p style={{ color: "gray", fontSize: "0.9rem", margin: 0 }}>
                        {images.length} images stored ({totalMb} MB total)
                    </p>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <button
                        onClick={selectAll}
                        className="btn"
                        style={{ border: "1px solid var(--border)", backgroundColor: "transparent" }}
                        disabled={images.length === 0}
                    >
                        {selectedUrls.size === images.length && images.length > 0 ? "Deselect All" : "Select All"}
                    </button>

                    <button
                        onClick={handleDelete}
                        className="btn btn-primary"
                        style={{ backgroundColor: "var(--danger)", opacity: selectedUrls.size === 0 || isDeleting ? 0.5 : 1 }}
                        disabled={selectedUrls.size === 0 || isDeleting}
                    >
                        {isDeleting ? "Deleting..." : `Delete Selected (${selectedUrls.size})`}
                    </button>
                </div>
            </div>

            {/* Image Grid */}
            {images.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", backgroundColor: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem", color: "gray", opacity: 0.5 }}>📸</div>
                    <h3 style={{ fontSize: "1.25rem", color: "gray" }}>Storage is Empty</h3>
                    <p style={{ color: "gray", fontSize: "0.9rem" }}>There are no images currently hosted on Vercel Blob.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                    {images.map((img) => {
                        const isSelected = selectedUrls.has(img.url);
                        return (
                            <div
                                key={img.url}
                                onClick={() => toggleSelection(img.url)}
                                style={{
                                    position: "relative",
                                    aspectRatio: "1",
                                    borderRadius: "var(--radius-md)",
                                    overflow: "hidden",
                                    border: isSelected ? "3px solid var(--primary)" : "1px solid var(--border)",
                                    cursor: "pointer",
                                    transition: "all 0.1s ease"
                                }}
                            >
                                <Image
                                    src={img.url}
                                    alt={img.pathname}
                                    fill
                                    style={{ objectFit: "cover", opacity: isSelected ? 0.8 : 1 }}
                                    sizes="250px"
                                />

                                {/* Info Overlay */}
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.5rem", background: "rgba(0,0,0,0.6)", color: "white", fontSize: "0.75rem", display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                                        {new Date(img.uploadedAt).toLocaleDateString()}
                                    </span>
                                    <span>{(img.size / 1024).toFixed(0)} KB</span>
                                </div>

                                {/* Selection Checkbox Visual */}
                                {isSelected && (
                                    <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", backgroundColor: "var(--primary)", color: "white", width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                                        ✓
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
