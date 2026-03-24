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
 
    if (hasError) {
        return (
            <div style={{ padding: '1rem', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--danger)' }}>
                Image failed to load. <br/>
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{src.substring(0, 50)}...</span>
            </div>
        );
    }
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '140px' }}>
            <img
                src={src}
                alt={alt}
                className={className}
                style={{ ...style, display: 'block' }}
                loading="lazy"
                decoding="async"
                onError={() => setHasError(true)}
            />
        </div>
    );
}
