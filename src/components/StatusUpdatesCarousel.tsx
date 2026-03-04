"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface StatusUpdate {
    id: number;
    imageUrl: string | null;
    message: string;
    views: number;
    expiresAt: string;
    createdAt: string;
}

const getTimeAgo = (dateString: string) => {
    const diffInMins = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 60000);
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInMins < 1) return "Just now";
    if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'min' : 'mins'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    return "1 day ago";
};

const CARD_GRADIENTS = [
    "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
    "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
    "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
    "linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)",
];

// Helper to ensure text is always visible against the background
const getTextColor = (card: StatusUpdate) => {
    if (card.imageUrl) return "#ffffff"; // Images have a dark overlay
    // For our specific gradients, white works best, but we could add logic here
    // to return a dark color if we had light gradients.
    return "#ffffff";
};

export default function StatusUpdatesCarousel() {
    const [cards, setCards] = useState<StatusUpdate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewedIds, setViewedIds] = useState<Set<number>>(new Set());
    const [swipeCount, setSwipeCount] = useState(0);
    const [exitX, setExitX] = useState<number>(0);
    const [selectedCard, setSelectedCard] = useState<StatusUpdate | null>(null);

    useEffect(() => {
        fetch("/api/status-updates").then(res => res.json()).then(data => {
            if (data.updates) setCards(data.updates);
            setIsLoading(false);
        });
    }, []);

    const handleView = async (id: number) => {
        if (viewedIds.has(id)) return;
        setViewedIds(prev => new Set(prev).add(id));
        fetch(`/api/status-updates/${id}/view`, { method: "POST" }).catch(() => { });
    };

    useEffect(() => {
        if (cards.length > 0) handleView(cards[0].id);
    }, [cards]);

    if (isLoading || cards.length === 0) return null;

    const currentCard = cards[swipeCount % cards.length];
    const bgCard = cards[(swipeCount + 1) % cards.length];

    const handleSwipe = () => {
        setSwipeCount(prev => {
            const nextIdx = (prev + 1) % cards.length;
            handleView(cards[nextIdx].id);
            return prev + 1;
        });
    };

    const getCardBackground = (card: StatusUpdate) =>
        card.imageUrl ? "var(--surface)" : CARD_GRADIENTS[card.id % CARD_GRADIENTS.length];

    const renderCardContent = (card: StatusUpdate) => {
        if (card.imageUrl) {
            return (
                <>
                    <Image src={card.imageUrl} alt="Update" fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 400px" priority />
                    <div className="image-overlay" />
                    <div className="update-content image-mode">
                        <div className="update-meta"><span className="live-badge">UPDATE</span><span>{getTimeAgo(card.createdAt)}</span></div>
                        <p>{card.message}</p>
                    </div>
                </>
            );
        }
        return (
            <div className="update-content text-mode">
                <div className="decorative-circle" />
                <div className="update-meta"><span className="live-badge">UPDATE</span><span>{getTimeAgo(card.createdAt)}</span></div>
                <div className="text-mode-message-container">
                    <p className="large-text">{card.message}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="updates-wrapper">
            <div className="deck-container">
                <AnimatePresence custom={exitX} mode="wait">
                    <motion.div
                        key={swipeCount}
                        className={`update-card ${currentCard.imageUrl ? 'clickable' : ''}`}
                        style={{
                            background: getCardBackground(currentCard),
                            position: 'relative',
                            color: getTextColor(currentCard)
                        }}
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ x: exitX, opacity: 0, scale: 0.9, position: 'absolute' }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        drag={cards.length > 1 ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.8}
                        dragDirectionLock={true}
                        onDragStart={() => {
                            if (selectedCard) setSelectedCard(null);
                        }}
                        onDragEnd={(e, info: PanInfo) => {
                            if (info.offset.x > 50) { setExitX(300); handleSwipe(); }
                            else if (info.offset.x < -50) { setExitX(-300); handleSwipe(); }
                        }}
                        onClick={() => {
                            if (currentCard.imageUrl) {
                                setSelectedCard(currentCard);
                            }
                        }}
                        whileTap={cards.length > 1 ? { cursor: "grabbing" } : {}}
                    >
                        {renderCardContent(currentCard)}
                    </motion.div>
                </AnimatePresence>
            </div>

            {cards.length > 1 && (
                <div className="swipe-label"><span>👈</span> Swipe to see more updates <span>👉</span></div>
            )}

            {/* Full View Modal */}
            <AnimatePresence>
                {selectedCard && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedCard(null)}
                    >
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.7}
                            dragDirectionLock={true}
                            onDragEnd={(e, info: PanInfo) => {
                                // Horizontal Swipe (Switch card)
                                if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
                                    const direction = info.offset.x > 0 ? 300 : -300;
                                    setExitX(direction);
                                    handleSwipe();
                                    setSelectedCard(null);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: getCardBackground(selectedCard),
                                color: getTextColor(selectedCard)
                            }}
                        >
                            <button className="close-btn" onClick={() => setSelectedCard(null)}>×</button>

                            {selectedCard.imageUrl && (
                                <div className="modal-image-container">
                                    <Image
                                        src={selectedCard.imageUrl}
                                        alt="Status Update"
                                        width={800}
                                        height={800}
                                        style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                    />
                                </div>
                            )}

                            <div className="modal-text-container">
                                <div className="update-meta">
                                    <span className="live-badge">UPDATE</span>
                                    <span>{getTimeAgo(selectedCard.createdAt)}</span>
                                </div>
                                <p className="full-message">{selectedCard.message}</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
                .updates-wrapper { margin-bottom: 2rem; display: flex; flex-direction: column; }
                .deck-container { position: relative; width: 100%; height: 240px; perspective: 1000px; }
                :global(.update-card) { top: 0; left: 0; width: 100%; height: 100%; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; cursor: grab; color: white; }
                :global(.update-card.clickable) { cursor: pointer; }
                :global(.decorative-circle) { position: absolute; right: -30px; bottom: -50px; width: 250px; height: 250px; background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; z-index: 1; pointer-events: none; }
                :global(.image-overlay) { position: absolute; bottom: 0; left: 0; width: 100%; height: 75%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%); pointer-events: none; z-index: 1; }
                :global(.update-content) { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; flex-grow: 1; justify-content: flex-end; position: relative; z-index: 2; }
                :global(.update-content.image-mode) { position: absolute; bottom: 0; left: 0; right: 0; padding-top: 2rem; }
                :global(.update-content.text-mode) { justify-content: center; height: 100%; }
                :global(.text-mode-message-container) { display: flex; flex-direction: column; flex-grow: 1; align-items: center; justify-content: center; padding: 0.5rem 0; width: 100%; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
                :global(.text-mode-message-container::-webkit-scrollbar) { display: none; }
                :global(.update-meta) { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; opacity: 0.9; margin-bottom: 0.75rem; }
                :global(.live-badge) { background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 99px; font-weight: bold; font-size: 0.7rem; letter-spacing: 0.05em; backdrop-filter: blur(4px); }
                :global(.update-content p) { margin: 0; font-family: 'Times New Roman', Times, serif; font-size: 1.1rem; line-height: 1.4; font-weight: bold; text-align: center; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 3px rgba(0,0,0,0.8); color: white; }
                :global(.update-content.text-mode p) { display: block; overflow: visible; text-shadow: 0 1px 2px rgba(0,0,0,0.4); font-size: 1.3rem; color: #ffffff; width: 100%; }
                .swipe-label { margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted, gray); font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 0.5rem; animation: pulse 2s infinite; }
                @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    backdrop-filter: blur(8px);
                }
                .modal-content {
                    width: 100%;
                    max-width: 600px;
                    max-height: 90vh;
                    border-radius: 24px;
                    padding: 2rem;
                    position: relative;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    cursor: pointer;
                    z-index: 10;
                    transition: background 0.2s;
                }
                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                .modal-image-container {
                    margin-bottom: 1.5rem;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
                }
                .modal-text-container {
                    position: relative;
                }
                .full-message {
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 1.4rem;
                    line-height: 1.6;
                    font-weight: bold;
                    text-align: center;
                    white-space: pre-wrap;
                }
                
                @media (max-width: 768px) { 
                    .deck-container { height: 220px; } 
                    .modal-content { padding: 1.5rem; }
                    .full-message { font-size: 1.2rem; }
                }
            `}</style>
        </div>
    );
}
