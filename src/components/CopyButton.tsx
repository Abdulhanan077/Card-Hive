"use client";

import { useState } from "react";

export default function CopyButton({ textToCopy, label }: { textToCopy: string, label?: string }) {
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
            style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: copied ? 1 : 0.6,
                transition: "opacity 0.2s",
                marginLeft: "0.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            {copied ? (
                <span style={{ color: "var(--success)" }}>✓ copied</span>
            ) : (
                <span>📋</span>
            )}
        </button>
    );
}
