"use client";

import { useEffect, useState } from "react";
import { getPendingRewardsCountAction } from "@/app/actions/admin";

export default function RewardsCounter() {
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const c = await getPendingRewardsCountAction();
                setCount(c);
            } catch (error) {
                console.error("Failed to fetch pending rewards count", error);
            }
        };

        fetchCount();
        const interval = setInterval(fetchCount, 30000); // 30s
        return () => clearInterval(interval);
    }, []);

    if (count === null || count === 0) return null;

    return (
        <span style={{ 
            backgroundColor: 'var(--danger)', 
            color: 'white', 
            borderRadius: '100px', 
            padding: '2px 8px', 
            fontSize: '0.75rem', 
            fontWeight: 800,
            marginLeft: 'auto',
            boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
        }}>
            {count > 99 ? '99+' : count}
        </span>
    );
}
