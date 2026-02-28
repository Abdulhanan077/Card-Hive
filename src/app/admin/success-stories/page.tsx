"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SafeImage from "@/app/components/SafeImage";

interface SuccessStory {
    id: number;
    imageUrl: string;
    caption: string | null;
    expiresAt: string;
    createdAt: string;
}

export default function AdminSuccessStoriesPage() {
    const router = useRouter();
    const [stories, setStories] = useState<SuccessStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [caption, setCaption] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const res = await fetch("/api/success-stories");
            const data = await res.json();
            if (res.ok) {
                setStories(data.stories);
            }
        } catch (error) {
            console.error("Failed to fetch stories:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImages(files);

            // Cleanup old previews
            previewUrls.forEach(url => URL.revokeObjectURL(url));

            const newPreviews = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(newPreviews);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (images.length === 0) return;

        setIsUploading(true);
        setMessage(null);

        try {
            let successCount = 0;
            let errorOccurred = false;

            for (const img of images) {
                const formData = new FormData();
                formData.append("image", img);
                formData.append("caption", caption);

                const res = await fetch("/api/admin/success-stories", {
                    method: "POST",
                    body: formData,
                });

                if (res.ok) {
                    successCount++;
                } else {
                    errorOccurred = true;
                }
            }

            if (successCount > 0) {
                setMessage({
                    type: errorOccurred ? 'error' : 'success',
                    text: `Uploaded ${successCount} storeis! ${errorOccurred ? "Some failed." : "They will be visible for 24 hours."}`
                });
                setImages([]);
                setPreviewUrls([]);
                setCaption("");
                fetchStories();
            } else {
                setMessage({ type: 'error', text: "Failed to upload any images." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: "An error occurred during upload" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this success story?")) return;

        try {
            const res = await fetch(`/api/admin/success-stories?id=${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchStories();
            } else {
                alert("Failed to delete story");
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    return (
        <div className="admin-stories-container">
            <header className="dashboard-header">
                <h1 className="dashboard-title">Manage Success Stories</h1>
                <p className="dashboard-subtitle">Upload screenshots of successful payouts to motivate users. Each post expires automatically after 24 hours.</p>
            </header>

            {message && (
                <div className={`alert alert-${message.type}`} style={{ marginBottom: '2rem' }}>
                    {message.text}
                </div>
            )}

            <div className="summary-cards" style={{ marginBottom: '2rem' }}>
                <div className="summary-card" style={{ gridColumn: 'span 1' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Upload New Proof</h3>
                    <form onSubmit={handleUpload}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Select Screenshot(s)</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                            />
                        </div>

                        {previewUrls.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {previewUrls.map((url, idx) => (
                                    <div key={idx} style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <Image src={url} alt={`Preview ${idx}`} fill style={{ objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Caption (Optional)</label>
                            <input
                                type="text"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="e.g., GH₵ 5,400 paid instantly via MTN"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--background)' }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={images.length === 0 || isUploading}
                            style={{ width: '100%' }}
                        >
                            {isUploading ? "Uploading..." : `Upload ${images.length > 1 ? images.length + " Stories" : "Success Story"}`}
                        </button>
                    </form>
                </div>

                <div className="summary-card" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Active Success Stories ({stories.length})</h3>
                    {isLoading ? (
                        <p>Loading...</p>
                    ) : stories.length === 0 ? (
                        <p>No active success stories. Upload one to get started!</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
                            {stories.map((story) => (
                                <div key={story.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--background)' }}>
                                    <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                                        <SafeImage
                                            src={story.imageUrl}
                                            alt="Success Proof"
                                            style={{ width: "100%", height: "150px", objectFit: "cover" }}
                                            fallbackText="Story Image Expired"
                                        />
                                    </div>
                                    <div style={{ padding: '1rem' }}>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.5rem', minHeight: '2.4rem' }}>
                                            {story.caption || "No caption"}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--foreground)', opacity: 0.6, marginBottom: '1rem' }}>
                                            Expires: {new Date(story.expiresAt).toLocaleString()}
                                        </p>
                                        <button
                                            onClick={() => handleDelete(story.id)}
                                            className="btn btn-secondary"
                                            style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
