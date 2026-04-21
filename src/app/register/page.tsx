"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../login/auth.module.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<1 | 2>(1);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const refCode = searchParams.get("ref");

    // Form data state
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        referralCode: refCode || "",
    });

    const [otp, setOtp] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    username: formData.username,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Failed to send verification code");
            }

            setStep(2); // Move to OTP entry step
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    phoneNumber: formData.phoneNumber,
                    password: formData.password,
                    ref: formData.referralCode,
                    otp: otp,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Registration failed");
            }

            router.push("/login?registered=true");
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
                        <div className={styles.iconWrapper}>✨</div>
                        <h2>Create an Account</h2>
                        <p>Join MyCardHive to start trading securely</p>
                    </div>

                    {step === 1 ? (
                        <form onSubmit={handleSendOTP} className={styles.form}>
                            {error && <div className={styles.errorMessage}>{error}</div>}

                            <div className="form-group">
                                <label htmlFor="username" className="form-label">Username</label>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    className="form-input"
                                    required
                                    placeholder="Unique username"
                                    value={formData.username}
                                    onChange={handleChange}
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
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phoneNumber" className="form-label">Phone Number (MTN/Telecel)</label>
                                <input
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    type="tel"
                                    className="form-input"
                                    required
                                    placeholder="e.g. +233 55 123 4567"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
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
                                        value={formData.password}
                                        onChange={handleChange}
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
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
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
                                <label htmlFor="referralCode" className="form-label">Referral Code (Optional)</label>
                                <input
                                    id="referralCode"
                                    name="referralCode"
                                    type="text"
                                    className="form-input"
                                    placeholder="Did someone invite you?"
                                    value={formData.referralCode}
                                    onChange={handleChange}
                                />
                            </div>

                            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1rem", marginBottom: "1rem", opacity: 0.8 }}>
                                By continuing, you agree to MyCardHive{" "}
                                <Link href="/terms-of-service" style={{ color: "var(--primary)", fontWeight: "600" }}>Terms of Use</Link>{" "}
                                and confirm that you have read{" "}
                                <Link href="/privacy-policy" style={{ color: "var(--primary)", fontWeight: "600" }}>Privacy Policy</Link>
                            </p>
                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${styles.submitBtn}`}
                                disabled={loading}
                            >
                                {loading ? "Sending Code..." : "Continue"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className={styles.form}>
                            {error && <div className={styles.errorMessage}>{error}</div>}
                            <div className={styles.authHeader} style={{ marginBottom: "2rem" }}>
                                <p>We sent a 6-digit verification code to <strong>{formData.email}</strong>.</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="otp" className="form-label" style={{ textAlign: "center" }}>Verification Code</label>
                                <input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    maxLength={6}
                                    className="form-input"
                                    required
                                    placeholder="Enter 6-digit code"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    style={{
                                        letterSpacing: "0.5rem",
                                        textAlign: "center",
                                        fontSize: "1.5rem",
                                        fontWeight: "bold",
                                    }}
                                />
                            </div>

                            <button
                                type="submit"
                                className={`btn btn-primary w-full ${styles.submitBtn}`}
                                disabled={loading || otp.length < 6}
                            >
                                {loading ? "Verifying..." : "Complete Registration"}
                            </button>

                            <button
                                type="button"
                                className={`btn w-full`}
                                onClick={() => setStep(1)}
                                disabled={loading}
                                style={{ marginTop: "1rem", background: "none", color: "inherit", border: "1px solid var(--border-color)", cursor: "pointer", padding: "0.8rem", borderRadius: "8px" }}
                            >
                                Back to Details
                            </button>
                        </form>
                    )}

                    <div className={styles.authFooter}>
                        <p>
                            Already have an account?{" "}
                            <Link href="/login" className={styles.link}>
                                Sign in instead
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading application...</div>}>
            <RegisterForm />
        </Suspense>
    );
}

