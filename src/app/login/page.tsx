"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoginPage() {
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
            isAdminLogin: "false"
        });

        if (res?.error) {
            setError("Invalid username or password");
            setLoading(false);
        } else {
            router.push("/user");
            router.refresh(); // Crucial to update the session in header immediately
        }
    };

    return (
        <>
            <Header />
            <main className={styles.authContainer}>
                <div className={`card ${styles.authCard}`}>
                    <div className={styles.authHeader}>
                        <div className={styles.iconWrapper}>🔒</div>
                        <h2>Welcome Back</h2>
                        <p>Sign in to Card Hive to track your trades</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.errorMessage}>{error}</div>}

                        <div className="form-group">
                            <label htmlFor="identifier" className="form-label">Username or Email</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                className="form-input"
                                required
                                placeholder="Enter username or email"
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
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary w-full ${styles.submitBtn}`}
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <p>
                            Don't have an account?{" "}
                            <Link href="/register" className={styles.link}>
                                Create an account
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
