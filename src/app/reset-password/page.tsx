"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../login/auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailFromQuery = searchParams.get("email") || "";

    const [formData, setFormData] = useState({
        email: emailFromQuery,
        otp: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    otp: formData.otp,
                    newPassword: formData.newPassword,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Failed to reset password");
            }

            setMessage(data.message);
            setTimeout(() => {
                router.push("/login?reset=success");
            }, 3000);
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
                        <div className={styles.iconWrapper}>🔒</div>
                        <h2>Set New Password</h2>
                        <p>Enter the 6-digit code sent to your email and your new password</p>
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
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="otp" className="form-label">Verification Code</label>
                            <input
                                id="otp"
                                name="otp"
                                type="text"
                                maxLength={6}
                                className="form-input"
                                required
                                placeholder="6-digit code"
                                value={formData.otp}
                                onChange={handleChange}
                                style={{ letterSpacing: "0.2rem", textAlign: "center", fontWeight: "bold" }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label">New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="newPassword"
                                    name="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    required
                                    placeholder="Minimum 8 characters"
                                    value={formData.newPassword}
                                    onChange={handleChange}
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
                                        padding: "0.25rem",
                                        cursor: "pointer",
                                        opacity: 0.6
                                    }}
                                >
                                    {showPassword ? "👁️‍🗨️" : "👁️"}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                required
                                placeholder="Repeat new password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary w-full ${styles.submitBtn}`}
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <p>
                            Wait, I remember!{" "}
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
