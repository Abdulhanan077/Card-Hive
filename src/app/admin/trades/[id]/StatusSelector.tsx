"use client";

import { useState } from "react";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

interface StatusSelectorProps {
    currentStatus: string;
}

const statusOptions = [
    { value: "PENDING", label: "Pending (Initial)" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "PAID", label: "Mark Accepted Cards as PAID" },
    { value: "REJECTED", label: "Reject ENTIRE Batch (Careful!)" }
];

export default function StatusSelector({ currentStatus }: StatusSelectorProps) {
    const [status, setStatus] = useState(currentStatus);

    return (
        <div className="form-group mb-0">
            <SearchableCategorySelect
                className="form-select"
                required={true}
                value={status}
                onChange={(val) => setStatus(val)}
                categories={statusOptions}
                placeholder="Select New Status..."
                showSearch={false}
            />
            <input type="hidden" name="status" value={status} />
        </div>
    );
}
