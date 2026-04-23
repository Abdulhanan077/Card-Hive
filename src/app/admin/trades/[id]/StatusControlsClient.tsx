"use client";

import { useNotification } from "@/context/NotificationContext";
import { useFormStatus } from "react-dom";
import React from "react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={pending} 
            style={{ 
                height: '48px', 
                borderRadius: '12px', 
                fontWeight: 700, 
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                marginTop: '0.5rem'
            }}
        >
            {pending ? "Processing..." : "Update Trade Status"}
        </button>
    );
}

export default function StatusControlsClient({ action, children }: { action: (formData: FormData) => Promise<any>, children: React.ReactNode }) {
    const { showNotification } = useNotification();

    const formAction = async (formData: FormData) => {
        try {
            const result = await action(formData) as any;
            if (result && result.success === false) {
                showNotification('ERROR', result.message || 'Failed to update trade status.');
            } else {
                showNotification('SUCCESS', 'Trade status updated successfully!');
            }
        } catch (error: any) {
            console.error("Update failed:", error);
            showNotification('ERROR', error.message || 'Failed to update trade status.');
        }
    };

    return (
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {children}
            <SubmitButton />
        </form>
    );
}
