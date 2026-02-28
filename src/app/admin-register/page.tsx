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
    const [otpSent, setOtpSent] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    const handleSendOTP = async (formData: any) => {
        const { username, email, secretPasscode } = formData;
        if (!username || !email || !secretPasscode) {
            setError("Username, email, and secret passcode are required to send code.");
            return;
        }

        setOtpLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/send-admin-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, secretPasscode }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to send code");

            setOtpSent(true);
            setResendCountdown(60);
            const timer = setInterval(() => {
                setResendCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const email = formData.get("email") as string;
        const phoneNumber = formData.get("phoneNumber") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;
        const secretPasscode = formData.get("secretPasscode") as string;
        const otp = formData.get("otp") as string;

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        if (!otp) {
            setError("Please enter the verification code sent to your email.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/register-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    email,
                    phoneNumber,
                    password,
                    secretPasscode,
                    otp
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

                        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                <label htmlFor="otp" className="form-label">Email Verification Code</label>
                                <input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    className="form-input"
                                    required={otpSent}
                                    disabled={!otpSent}
                                    placeholder={otpSent ? "Enter 6-digit code" : "Click send code first"}
                                />
                            </div>
                            <button
                                type="button"
                                className="btn"
                                style={{
                                    flex: 1,
                                    height: '42px',
                                    padding: '0 1rem',
                                    fontSize: '0.85rem',
                                    backgroundColor: resendCountdown > 0 ? '#ccc' : 'var(--danger)',
                                    color: 'white'
                                }}
                                disabled={otpLoading || resendCountdown > 0}
                                onClick={(e) => {
                                    const form = e.currentTarget.closest('form');
                                    if (form) {
                                        const formData = new FormData(form);
                                        handleSendOTP(Object.fromEntries(formData));
                                    }
                                }}
                            >
                                {otpLoading ? "Sending..." : resendCountdown > 0 ? `Resend (${resendCountdown}s)` : otpSent ? "Resend Code" : "Send Code"}
                            </button>
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
