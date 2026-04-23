"use client";

import { useState, useEffect } from "react";
import { IoImageOutline, IoWarningOutline } from "react-icons/io5";

interface SafeImageProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    useLink?: boolean;
    fallbackText?: string;
}

export default function SafeImage({ src, alt, className, style, useLink, fallbackText }: SafeImageProps) {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        setStatus('loading');
    }, [src]);

    const content = (
        <div className={`safe-image-container ${status}`} style={{ ...style, position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {status === 'loading' && (
                <div className="image-skeleton">
                    <div className="skeleton-pulse"></div>
                    <IoImageOutline className="skeleton-icon" />
                </div>
            )}
            
            {status === 'error' && (
                <div className="image-error-state">
                    <div className="error-icon-box">
                        <IoWarningOutline />
                    </div>
                    <span>{fallbackText || "Preview unavailable"}</span>
                </div>
            )}

            <img
                src={src}
                alt={alt}
                className={`${className} ${status === 'success' ? 'visible' : 'hidden'}`}
                onLoad={() => setStatus('success')}
                onError={() => setStatus('error')}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.4s ease',
                    opacity: status === 'success' ? 1 : 0
                }}
            />

            {/* Overlay for success state only if useLink is true */}
            {status === 'success' && useLink && (
                <div className="thumb-overlay">
                    <svg className="icon-sm" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </div>
            )}

            <style jsx>{`
                .safe-image-container {
                    background: var(--bg-alt);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 140px;
                }
                .image-skeleton {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-alt);
                }
                .skeleton-pulse {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    animation: pulse 1.5s infinite;
                }
                @keyframes pulse {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .skeleton-icon {
                    font-size: 2rem;
                    color: var(--border);
                }
                .image-error-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--text-muted);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .error-icon-box {
                    font-size: 1.5rem;
                    opacity: 0.5;
                }
                .hidden {
                    position: absolute;
                    opacity: 0;
                }
                .visible {
                    opacity: 1;
                }
                .thumb-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(37, 99, 235, 0.4);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    opacity: 0;
                    transition: all 0.3s ease;
                }
                .safe-image-container:hover .thumb-overlay {
                    opacity: 1;
                }
                .icon-sm { width: 18px; height: 18px; }
            `}</style>
        </div>
    );

    if (useLink && status === 'success') {
        return (
            <a href={src} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                {content}
            </a>
        );
    }

    return content;
}

