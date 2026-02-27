"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../login/auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Something went wrong");
            }

            setMessage(data.message);
            // After successful request, redirect to reset page with email in query
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email)}`);
            }, 2000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <main className={styles.authContainer}>
                <div className={`card ${styles.authCard}`}>
                    <div className={styles.authHeader}>
                        <div className={styles.iconWrapper}>🔑</div>
                        <h2>Forgot Password</h2>
                        <p>Enter your email to receive a 6-digit verification code</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.errorMessage}>{error}</div>}
                        {message && <div style={{ color: "var(--success)", marginBottom: "1rem", textAlign: "center", fontSize: "0.875rem" }}>{message}</div>}

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="form-input"
                                required
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary w-full ${styles.submitBtn}`}
                            disabled={loading}
                        >
                            {loading ? "Sending Code..." : "Send Verification Code"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <p>
                            Remember your password?{" "}
                            <Link href="/login" className={styles.link}>
                                Back to Login
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
