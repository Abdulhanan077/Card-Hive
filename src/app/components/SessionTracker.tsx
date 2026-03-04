"use client";
import { useEffect } from "react";
import { trackSession } from "@/app/actions/security";

export default function SessionTracker() {
    useEffect(() => {
        trackSession().catch(console.error);
    }, []);
    return null;
}
