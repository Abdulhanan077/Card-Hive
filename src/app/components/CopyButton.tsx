"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy!", err);
        }
    };

    return (
        <button 
            className={`copy-btn ${copied ? 'copied' : ''}`} 
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy to clipboard"}
        >
            {copied ? (
                <svg className="icon-xs" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="icon-xs" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            )}
            
            <style jsx>{`
                .copy-btn {
                    background: white;
                    border: 1px solid var(--border);
                    padding: 0.5rem;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                }
                .copy-btn:hover {
                    background: var(--primary-light);
                    color: var(--primary);
                    border-color: var(--primary);
                }
                .copy-btn.copied {
                    background: #dcfce7;
                    color: #16a34a;
                    border-color: #16a34a;
                }
                .icon-xs {
                    width: 16px;
                    height: 16px;
                }
            `}</style>
        </button>
    );
}
