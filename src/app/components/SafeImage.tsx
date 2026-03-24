"use client";

import { useState } from "react";
import { IoImageOutline, IoWarningOutline } from "react-icons/io5";

interface SafeImageProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    height?: number;
    fallbackText?: string;
}

export default function SafeImage({ src, alt, className, style, width, height, fallbackText = "Image unavailable" }: SafeImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    if (hasError) {
        return (
            <div
                className={className}
                style={{
                    ...style,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--surface-hover)',
                    border: '1px dashed var(--border)',
                    color: 'var(--text-muted)',
                    padding: '1rem',
                    textAlign: 'center',
                    minHeight: height || '150px'
                }}
            >
                <IoWarningOutline size={24} style={{ marginBottom: '0.5rem', color: 'var(--danger)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>{fallbackText}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem', wordBreak: 'break-all' }}>
                    {src.substring(0, 30)}...
                </span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {isLoading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--surface-hover)',
                    zIndex: 1
                }}>
                    <div className="spinner-small" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                className={className}
                style={{ ...style, display: isLoading ? 'none' : 'block' }}
                loading="lazy"
                decoding="async"
                onError={() => setHasError(true)}
                onLoad={() => setIsLoading(false)}
            />
        </div>
    );
}
