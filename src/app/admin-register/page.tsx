"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../login/auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminRegisterPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const target = e.target as typeof e.target & {
            username: { value: string };
            email: { value: string };
            phoneNumber: { value: string };
            password: { value: string };
            confirmPassword: { value: string };
            secretPasscode: { value: string };
        };

        if (target.password.value !== target.confirmPassword.value) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: target.username.value,
                    email: target.email.value,
                    phoneNumber: target.phoneNumber.value,
                    password: target.password.value,
                    secretPasscode: target.secretPasscode.value
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Registration failed");
            }

            router.push("/admin-login?registered=true");
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
                <div className={`card ${styles.authCard}`} style={{ borderTop: "4px solid var(--danger)" }}>
                    <div className={styles.authHeader}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: "var(--danger)", color: "white" }}>🛡️</div>
                        <h2>Create Admin Account</h2>
                        <p>Requires authorized passcode</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <div className="form-group" style={{ backgroundColor: "#fee2e2", padding: "1rem", borderRadius: "8px" }}>
                            <label htmlFor="secretPasscode" className="form-label" style={{ color: "var(--danger)" }}>Secret Passcode</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="secretPasscode"
                                    name="secretPasscode"
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    required
                                    placeholder="Required for admin creation"
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
                        </div>


                        <div className="form-group">
                            <label htmlFor="username" className="form-label">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                className="form-input"
                                required
                                placeholder="Unique username"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="form-input"
                                required
                                placeholder="you@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
                            <input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                className="form-input"
                                required
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
                                    placeholder="Strong password"
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
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    required
                                    placeholder="Repeat password"
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
                        </div>

                        <button
                            type="submit"
                            className={`btn w-full ${styles.submitBtn}`}
                            style={{ backgroundColor: "var(--danger)", color: "white" }}
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Admin"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <p>
                            Already an admin?{" "}
                            <Link href="/admin-login" className={styles.link}>
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
