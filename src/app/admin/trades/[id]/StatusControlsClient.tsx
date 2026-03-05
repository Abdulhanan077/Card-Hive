"use client";

import { useNotification } from "@/context/NotificationContext";
import { useFormStatus } from "react-dom";
import React from "react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" disabled={pending} style={{ padding: "0.5rem" }}>
            {pending ? "Updating..." : "Update Trade"}
        </button>
    );
}

export default function StatusControlsClient({ action, children }: { action: (formData: FormData) => Promise<void>, children: React.ReactNode }) {
    const { showNotification } = useNotification();

    const formAction = async (formData: FormData) => {
        try {
            await action(formData);
            showNotification('SUCCESS', 'Trade status updated successfully!');
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
