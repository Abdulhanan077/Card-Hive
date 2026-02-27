"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface SuccessStory {
    id: number;
    imageUrl: string;
    caption: string | null;
    expiresAt: string;
    createdAt: string;
}

const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();

    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'min' : 'mins'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;

    return "1 day ago"; // Stories expire in 24h anyway
};

export default function SuccessStoriesCarousel() {
    const [stories, setStories] = useState<SuccessStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
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

        fetchStories();
    }, []);

    if (isLoading || stories.length === 0) return null;

    return (
        <div className="success-stories-container">
            <div className="stories-header">
                <h3>💎 Recent Payout Proofs</h3>
                <span className="live-badge">LIVE PROOF</span>
            </div>

            <div className="stories-scroll">
                {stories.map((story) => (
                    <div key={story.id} className="story-card">
                        <div className="story-image-container">
                            <Image
                                src={story.imageUrl}
                                alt="Payout Proof"
                                fill
                                style={{ objectFit: 'cover' }}
                                sizes="(max-width: 768px) 150px, 200px"
                            />
                        </div>
                        {story.caption && (
                            <div className="story-caption">
                                {story.caption}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .success-stories-container {
                    margin-bottom: 2rem;
                    background: var(--surface);
                    padding: 1.5rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-sm);
                }
                .stories-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.25rem;
                }
                .stories-header h3 {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--foreground);
                    margin: 0;
                }
                .live-badge {
                    font-size: 0.65rem;
                    font-weight: 800;
                    background: #fef2f2;
                    color: #ef4444;
                    padding: 2px 8px;
                    border-radius: 99px;
                    border: 1px solid #fee2e2;
                    letter-spacing: 0.05em;
                }
                .stories-scroll {
                    display: flex;
                    gap: 1.25rem;
                    overflow-x: auto;
                    padding-bottom: 0.5rem;
                    scrollbar-width: thin;
                    scrollbar-color: var(--border) transparent;
                }
                .stories-scroll::-webkit-scrollbar {
                    height: 4px;
                }
                .stories-scroll::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 10px;
                }
                .story-card {
                    flex: 0 0 240px;
                    background: var(--background);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    overflow: hidden;
                    transition: transform 0.2s;
                }
                .story-card:hover {
                    transform: translateY(-4px);
                }
                .story-image-container {
                    position: relative;
                    width: 100%;
                    height: 180px;
                    background: #f3f4f6;
                    border-bottom: 1px solid var(--border);
                }
                .story-time-badge {
                    position: absolute;
                    bottom: 8px;
                    left: 8px;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(4px);
                    color: white;
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 4px;
                    z-index: 2;
                }
                .story-caption {
                    padding: 0.75rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--foreground);
                    line-height: 1.3;
                    min-height: 2.8rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .story-meta {
                    padding: 0 0.75rem 0.75rem;
                    font-size: 0.65rem;
                    color: #10b981;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                @media (max-width: 768px) {
                    .story-card {
                        flex: 0 0 220px;
                    }
                    .story-image-container {
                        height: 160px;
                    }
                }
            `}</style>
        </div>
    );
}
