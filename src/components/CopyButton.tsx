"use client";

import { useState } from "react";

export default function CopyButton({ textToCopy, label, className, style }: { textToCopy: string, label?: string, className?: string, style?: React.CSSProperties }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title={label || "Copy to clipboard"}
            className={className}
            type="button"
            style={{
                background: "var(--bg-alt, #f3f4f6)",
                border: "1px solid var(--border, #e5e7eb)",
                borderRadius: "6px",
                cursor: "pointer",
                padding: "0.2rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: copied ? "var(--success, #10b981)" : "var(--primary, #3b82f6)",
                transition: "all 0.2s ease-in-out",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                ...style
            }}
        >
            {copied ? (
                <>
                    <svg style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied</span>
                </>
            ) : (
                <>
                    <svg style={{ width: "12px", height: "12px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{label || "Copy"}</span>
                </>
            )}
        </button>
    );
}
