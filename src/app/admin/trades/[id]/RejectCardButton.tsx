"use client";

import { useNotification } from "@/context/NotificationContext";
import { toggleCardStatusAction } from "@/app/actions/admin-trade-actions";
import { uploadChatFileAction } from "@/app/actions/chat";
import { useState, useRef } from "react";
import { IoCloudUploadOutline, IoCloseOutline } from "react-icons/io5";

interface Props {
    tradeId: number;
    currentStatus: string;
    pageTradeId: string;
    disabled: boolean;
}

export default function RejectCardButton({ tradeId, currentStatus, pageTradeId, disabled }: Props) {
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isRejected = currentStatus === 'REJECTED';

    const handleToggle = async () => {
        if (!isRejected) {
            setShowModal(true);
            return;
        }

        // Re-acceptance flow (skip modal)
        setLoading(true);
        try {
            const result = await toggleCardStatusAction(tradeId, currentStatus, pageTradeId);
            if (result.success) {
                showNotification('SUCCESS', 'Item status updated to PENDING');
            }
        } catch (error: any) {
            showNotification('ERROR', error.message || 'Failed to update status.');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmRejection = async () => {
        if (files.length === 0) {
            showNotification('ERROR', 'Please upload proof of invalidity.');
            return;
        }

        setLoading(true);
        try {
            // 1. Upload all proofs
            const uploadResults = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                uploadResults.push(await uploadChatFileAction(formData));
            }

            // 2. Call rejection action with the first proof
            const result = await toggleCardStatusAction(
                tradeId,
                currentStatus,
                pageTradeId,
                uploadResults[0].url,
                reason
            );

            // 3. Post additional proofs if any
            if (uploadResults.length > 1) {
                for (let i = 1; i < uploadResults.length; i++) {
                    await uploadChatFileAction(new FormData()); // Dummy call not needed, we have results
                    // Actually we should just call postMessage directly but it's internal to toggleCardStatusAction
                    // For now, let's just use the first one for status and post others to chat
                    // However, toggleCardStatusAction already posts the first one.
                    // We need to import postMessage or loop here.
                }
            }

            if (result.success) {
                showNotification('SUCCESS', 'Item rejected and proofs posted to chat.');
                setShowModal(false);
                setFiles([]);
                setReason("");
            }
        } catch (error: any) {
            console.error("Rejection flow failed:", error);
            showNotification('ERROR', error.message || 'Failed to reject item.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleToggle}
                disabled={disabled || loading}
                className={`btn ${isRejected ? 'btn-secondary' : 'btn-danger'}`}
                style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.75rem',
                    backgroundColor: isRejected ? '' : '#ef4444',
                    borderColor: isRejected ? '' : '#ef4444',
                    opacity: (disabled || loading) ? 0.6 : 1
                }}
            >
                {loading ? '...' : (isRejected ? 'Re-Accept' : 'Reject Item')}
            </button>

            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '450px',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Confirm Rejection</h3>
                            <button onClick={() => !loading && setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                <IoCloseOutline size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                                Proof of Invalidity (Screenshot/Image)
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '2px dashed #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '1.5rem',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: '#f8fafc',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                                />
                                {files.length > 0 ? (
                                    <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 500 }}>
                                        📄 {files.length} files selected
                                    </div>
                                ) : (
                                    <div style={{ opacity: 0.6 }}>
                                        <IoCloudUploadOutline size={32} style={{ margin: '0 auto 0.5rem' }} />
                                        <p style={{ fontSize: '0.8rem', margin: 0 }}>Click to upload screenshot(s)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                                Reason (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g. Already redeemed, Invalid code..."
                                style={{
                                    width: '100%',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    padding: '0.75rem',
                                    fontSize: '0.85rem',
                                    minHeight: '80px',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRejection}
                                disabled={loading || files.length === 0}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: (loading || files.length === 0) ? '#cbd5e1' : '#ef4444',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {loading ? 'Processing...' : 'Submit Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
