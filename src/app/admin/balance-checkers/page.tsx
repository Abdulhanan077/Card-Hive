"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import { toast } from "react-hot-toast";
import SearchableCategorySelect from "@/components/SearchableCategorySelect";

type BalanceCheckerLink = {
    id: number;
    brandName: string;
    url: string;
    isActive: boolean;
};

const TOP_CARDS = [
    "Amazon", "American Express (Amex)", "Apple / iTunes", "Best Buy", "Delta Airlines",
    "eBay", "Google Play", "Home Depot", "Lowe's", "Macy's", "Mastercard", "Nike",
    "Nordstrom", "PlayStation", "Razer Gold", "Roblox", "Sephora", "Starbucks", 
    "Steam", "Target", "Vanilla Visa", "Walmart", "Xbox"
];

const ADD_CUSTOM_OPTION = "+ Add Custom Brand";

export default function AdminBalanceCheckersPage() {
    const [links, setLinks] = useState<BalanceCheckerLink[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [brandInputType, setBrandInputType] = useState<"SELECT" | "CUSTOM">("SELECT");
    const [brandName, setBrandName] = useState("");
    const [url, setUrl] = useState("");
    const [isActive, setIsActive] = useState(true);

    const fetchLinks = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/balance-checkers");
            const result = await res.json();
            if (result.success) {
                setLinks(result.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load balance checkers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, []);

    const resetForm = () => {
        setIsEditing(false);
        setCurrentId(null);
        setBrandInputType("SELECT");
        setBrandName("");
        setUrl("");
        setIsActive(true);
    };

    const handleEdit = (link: BalanceCheckerLink) => {
        setIsEditing(true);
        setCurrentId(link.id);
        
        if (TOP_CARDS.includes(link.brandName)) {
            setBrandInputType("SELECT");
        } else {
            setBrandInputType("CUSTOM");
        }
        
        setBrandName(link.brandName);
        setUrl(link.url);
        setIsActive(link.isActive);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const apiPath = isEditing ? `/api/admin/balance-checkers/${currentId}` : `/api/admin/balance-checkers`;
            const method = isEditing ? "PUT" : "POST";

            const res = await fetch(apiPath, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ brandName, url, isActive })
            });

            const result = await res.json();
            if (result.success) {
                toast.success(isEditing ? "Updated successfully" : "Added successfully");
                resetForm();
                fetchLinks();
            } else {
                toast.error(result.message || "Operation failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this link?")) return;

        try {
            const res = await fetch(`/api/admin/balance-checkers/${id}`, {
                method: "DELETE"
            });
            const result = await res.json();
            if (result.success) {
                toast.success("Deleted successfully");
                fetchLinks();
            } else {
                toast.error(result.message || "Delete failed");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        }
    };

    return (
        <div>
            <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
                <h1 className="dashboard-title">Balance Checkers</h1>
                <p className="dashboard-subtitle">Manage official gift card balance checker links for the public portal.</p>
            </div>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>{isEditing ? "Edit Link" : "Add New Link"}</h3>
                <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Brand Name</label>
                            {brandInputType === "SELECT" ? (
                                <SearchableCategorySelect 
                                    className="form-select" 
                                    required 
                                    value={TOP_CARDS.includes(brandName) ? brandName : ""}
                                    onChange={(val: string) => {
                                        if (val === ADD_CUSTOM_OPTION) {
                                            setBrandInputType("CUSTOM");
                                            setBrandName("");
                                        } else {
                                            setBrandName(val);
                                        }
                                    }}
                                    categories={[...TOP_CARDS, ADD_CUSTOM_OPTION]}
                                    placeholder="Select a brand..."
                                    searchPlaceholder="Search brands..."
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        required 
                                        value={brandName} 
                                        onChange={(e) => setBrandName(e.target.value)} 
                                        placeholder="Type brand name..."
                                        style={{ flex: 1 }}
                                    />
                                    <button type="button" className="btn btn-secondary" onClick={() => { setBrandInputType("SELECT"); setBrandName(""); }} style={{ padding: '0 1rem' }}>
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Official Link</label>
                            <input 
                                type="url" 
                                className="form-input" 
                                required 
                                value={url} 
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            id="isActive" 
                            checked={isActive} 
                            onChange={(e) => setIsActive(e.target.checked)} 
                            style={{ width: 'auto' }}
                        />
                        <label htmlFor="isActive" style={{ margin: 0, cursor: 'pointer' }}>Visible to public</label>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? "Saving..." : isEditing ? "Update Link" : "Add Link"}
                        </button>
                        {isEditing && (
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card">
                <h3>Managed Links</h3>
                {loading ? (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading links...</p>
                ) : links.length === 0 ? (
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No links added yet. Add one above.</p>
                ) : (
                    <div className="table-responsive" style={{ marginTop: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-alt)' }}>
                                    <th style={{ padding: '1rem' }}>Brand</th>
                                    <th style={{ padding: '1rem' }}>Link URL</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {links.map(link => (
                                    <tr key={link.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{link.brandName}</td>
                                        <td style={{ padding: '1rem', wordBreak: 'break-all', minWidth: '200px' }}>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                                                {link.url.length > 40 ? link.url.substring(0, 40) + "..." : link.url}
                                            </a>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className={`badge ${link.isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {link.isActive ? "Active" : "Hidden"}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <button onClick={() => handleEdit(link)} className="btn btn-secondary" style={{ padding: '0.4rem 0.6rem', marginRight: '0.5rem', fontSize: '0.85rem' }}>
                                                <FaEdit /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(link.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                                                <FaTrash />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx>{`
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                @media (max-width: 768px) {
                    .grid-2 { grid-template-columns: 1fr; gap: 1rem; }
                }
            `}</style>
        </div>
    );
}
