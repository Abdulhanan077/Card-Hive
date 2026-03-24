"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

export default function TradeFilterModern() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const currentStatus = searchParams.get("status") || "ALL";
    const currentPayout = searchParams.get("payoutMethod") || "ALL";

    const statusOptions = [
        { value: "ALL", label: "All Statuses" },
        { value: "PENDING", label: "Pending" },
        { value: "UNDER_REVIEW", label: "Under Review" },
        { value: "PAID", label: "Paid" },
        { value: "COMPLETED", label: "Completed" },
        { value: "REJECTED", label: "Rejected" }
    ];

    const payoutOptions = [
        { value: "ALL", label: "All Methods" },
        { value: "MOBILE_MONEY", label: "Mobile Money" },
        { value: "CRYPTO", label: "Crypto Only" }
    ];

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "ALL") {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        router.push(`/admin/trades?${params.toString()}`);
    };

    return (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: '1', minWidth: '150px' }}>
                <SearchableCategorySelect
                    className="form-select"
                    value={currentStatus}
                    onChange={(val) => handleFilterChange("status", val)}
                    categories={statusOptions}
                    placeholder="All Statuses"
                    showSearch={false}
                />
            </div>
            <div style={{ flex: '1', minWidth: '150px' }}>
                <SearchableCategorySelect
                    className="form-select"
                    value={currentPayout}
                    onChange={(val) => handleFilterChange("payoutMethod", val)}
                    categories={payoutOptions}
                    placeholder="All Methods"
                    showSearch={false}
                />
            </div>
        </div>
    );
}
