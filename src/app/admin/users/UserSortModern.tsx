"use client";

import { useRouter, useSearchParams } from "next/navigation";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

export default function UserSortModern() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sortBy = searchParams.get("sort") || "newest";

    const sortOptions = [
        { value: "newest", label: "Newest" },
        { value: "trades_desc", label: "Most Trades" },
        { value: "points_desc", label: "Most Points" }
    ];

    const handleSortChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", val);
        router.push(`/admin/users?${params.toString()}`);
    };

    return (
        <div style={{ minWidth: '150px' }}>
            <SearchableCategorySelect
                value={sortBy}
                onChange={handleSortChange}
                categories={sortOptions}
                className="form-select"
                showSearch={false}
            />
        </div>
    );
}
