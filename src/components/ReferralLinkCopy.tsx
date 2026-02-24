"use client";

import { useState, useEffect } from "react";
import { FaCopy, FaCheck } from "react-icons/fa";

export default function ReferralLinkCopy({ referralCode }: { referralCode: string | null }) {
    const [baseUrl, setBaseUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setBaseUrl(window.location.origin);
        }
    }, []);

    const fullLink = `${baseUrl}/register?ref=${referralCode || ""}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy!", err);
        }
    };

    // Don't render until we have the baseUrl to prevent hydration mismatch
    if (!baseUrl || !referralCode) {
        return (
            <input
                type="text"
                readOnly
                className="form-input"
                value="Generating your link..."
                style={{ margin: 0, flex: 1, backgroundColor: 'var(--bg-alt)', cursor: 'not-allowed', opacity: 0.6 }}
            />
        );
    }

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
            <input
                type="text"
                readOnly
                className="form-input"
                value={fullLink}
                style={{ margin: 0, flex: 1, backgroundColor: 'var(--bg-alt)', cursor: 'text' }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
                onClick={handleCopy}
                className="btn btn-secondary"
                style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                title="Copy to clipboard"
            >
                {copied ? (
                    <>
                        <FaCheck style={{ color: 'var(--success)' }} />
                        <span>Copied!</span>
                    </>
                ) : (
                    <>
                        <FaCopy />
                        <span>Copy</span>
                    </>
                )}
            </button>
        </div>
    );
}
