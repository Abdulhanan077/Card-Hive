"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SafeImage from "@/app/components/SafeImage";
import { useNotification } from "@/context/NotificationContext";

interface StatusUpdate {
    id: number;
    imageUrl: string | null;
    message: string;
    views: number;
    expiresAt: string;
    createdAt: string;
}

const CARD_GRADIENTS = [
    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
];

export default function AdminStatusUpdatesPage() {
    const router = useRouter();
    const { showNotification } = useNotification();
    const [updates, setUpdates] = useState<StatusUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [image, setImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [messageText, setMessageText] = useState("");

    useEffect(() => {
        fetchUpdates();
    }, []);

    const fetchUpdates = async () => {
        try {
            const res = await fetch("/api/status-updates");
            const data = await res.json();
            if (res.ok) {
                setUpdates(data.updates);
            }
        } catch (error) {
            console.error("Failed to fetch updates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImage(file);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setImage(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!messageText.trim()) {
            showNotification('ERROR', 'A message is required.');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            if (image) formData.append("image", image);
            formData.append("message", messageText);

            const res = await fetch("/api/admin/status-updates", {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                showNotification('SUCCESS', `Status update posted successfully! It will be visible for 24 hours.`);
                setImage(null);
                setPreviewUrl(null);
                setMessageText("");
                fetchUpdates();
            } else {
                showNotification('ERROR', "Failed to post status update.");
            }
        } catch (error) {
            showNotification('ERROR', "An error occurred while posting");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this status update?")) return;

        try {
            const res = await fetch(`/api/admin/status-updates?id=${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchUpdates();
                showNotification('SUCCESS', "Status update deleted.");
            } else {
                showNotification('ERROR', "Failed to delete status update");
            }
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    return (
        <div className="admin-stories-container">
            <header className="dashboard-header">
                <h1 className="dashboard-title">Manage Status Updates</h1>
                <p className="dashboard-subtitle">Broadcast professional updates and payment proofs to all users. Posts expire automatically after 24 hours.</p>
            </header>

            <div className="summary-cards" style={{ marginBottom: '2rem' }}>
                <div className="summary-card" style={{ gridColumn: 'span 1' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Post New Update</h3>
                    <form onSubmit={handleUpload}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Message <span style={{ color: 'var(--danger)' }}>*</span></label>
                            <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Important update for our users..."
                                required
                                rows={4}
                                className="form-input"
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--background)', color: 'var(--foreground)', resize: 'vertical' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Add an Image (Optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="form-input"
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--background)', color: 'var(--foreground)' }}
                            />
                        </div>

                        {previewUrl && (
                            <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                                <Image src={previewUrl} alt="Preview" fill style={{ objectFit: 'contain' }} />
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isUploading || !messageText.trim()}
                            style={{ width: '100%' }}
                        >
                            {isUploading ? "Posting..." : "Post Status Update"}
                        </button>
                    </form>
                </div>

                <div className="summary-card" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Active Updates ({updates.length})</h3>
                    {isLoading ? (
                        <p>Loading...</p>
                    ) : updates.length === 0 ? (
                        <p>No active status updates. Post one to communicate with your users!</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            {updates.map((update) => (
                                <div key={update.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: update.imageUrl ? 'var(--background)' : CARD_GRADIENTS[update.id % CARD_GRADIENTS.length], color: update.imageUrl ? 'var(--foreground)' : 'white', display: 'flex', flexDirection: 'column' }}>
                                    {update.imageUrl && (
                                        <div style={{ position: 'relative', width: '100%', height: '150px' }}>
                                            <SafeImage
                                                src={update.imageUrl}
                                                alt="Update Attachment"
                                                style={{ width: "100%", height: "150px", objectFit: "cover" }}
                                                fallbackText="Image Expired"
                                            />
                                        </div>
                                    )}
                                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <p style={{ fontSize: '1rem', fontFamily: "'Times New Roman', Times, serif", fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem', flex: 1, whiteSpace: 'pre-wrap', textShadow: update.imageUrl ? 'none' : '0 1px 2px rgba(0,0,0,0.2)' }}>
                                            {update.message}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: update.imageUrl ? '1px dashed var(--border)' : '1px dashed rgba(255,255,255,0.3)' }}>
                                            <p style={{ fontSize: '0.70rem', color: update.imageUrl ? 'var(--foreground)' : 'white', opacity: 0.8, margin: 0 }}>
                                                Expires: {new Date(update.expiresAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: update.imageUrl ? 'var(--text-muted)' : 'white', opacity: 0.9 }}>
                                                <svg style={{ width: '12px', height: '12px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{update.views}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(update.id)}
                                            className="btn btn-secondary"
                                            style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', color: update.imageUrl ? '#ef4444' : '#fee2e2', borderColor: update.imageUrl ? '#ef4444' : 'rgba(255,255,255,0.4)', background: update.imageUrl ? 'transparent' : 'rgba(239, 68, 68, 0.2)' }}
                                        >
                                            Delete Post
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
