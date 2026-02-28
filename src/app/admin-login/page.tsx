"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../login/auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const target = e.target as typeof e.target & {
            identifier: { value: string };
            password: { value: string };
        };

        const res = await signIn("credentials", {
            redirect: false,
            username: target.identifier.value,
            password: target.password.value,
            isAdminLogin: "true"
        });

        if (res?.error) {
            setError(res.error);
            setLoading(false);
        } else {
            router.push("/admin");
            router.refresh();
        }
    };

    return (
        <>
            <Header />
            <main className={styles.authContainer}>
                <div className={`card ${styles.authCard}`} style={{ borderTop: "4px solid var(--danger)" }}>
                    <div className={styles.authHeader}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: "var(--danger)", color: "white" }}>🛡️</div>
                        <h2>Admin Portal</h2>
                        <p>Restricted access. Authorized personnel only.</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <div className="form-group">
                            <label htmlFor="identifier" className="form-label">Admin Username</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                className="form-input"
                                required
                                placeholder="Enter admin username"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    required
                                    placeholder="••••••••"
                                    style={{ paddingRight: "2.5rem" }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: "0.75rem",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        opacity: 0.6,
                                        padding: "0.25rem",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? "👁️‍🗨️" : "👁️"}
                                </button>
                            </div>
                            <div style={{ textAlign: "right", marginTop: "0.5rem" }}>
                                <Link href="/forgot-password" style={{ fontSize: "0.875rem", color: "var(--danger)", fontWeight: "500" }}>
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`btn w-full ${styles.submitBtn}`}
                            style={{ backgroundColor: "var(--danger)", color: "white" }}
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : "Admin Sign In"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <p>
                            Need a new admin account? {" "}
                            <Link href="/admin-register" className={styles.link}>
                                Register Admin
                            </Link>
                        </p>
                        <p style={{ marginTop: '0.75rem' }}>
                            <Link href="/login" className={styles.link} style={{ opacity: 0.8, fontSize: '0.85em' }}>
                                &larr; Return to User Login
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
