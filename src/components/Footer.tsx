"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./footer.css";

export default function Footer() {
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => setSettings(data))
            .catch(err => console.error("Failed to fetch footer settings", err));
    }, []);

    const whatsappLink = settings?.whatsappNumber
        ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`
        : "#";

    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-brand">
                    <img src="/logo.png" alt="Card Hive Logo" style={{ height: '80px', width: 'auto', display: 'block', marginBottom: '1rem' }} />
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Quick Links</h4>
                    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.8, lineHeight: 1.8 }}>
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/login">Sign In</Link></li>
                        <li><Link href="/register">Create Account</Link></li>
                        <li style={{ marginTop: '0.5rem' }}>
                            <a href="/card-hive.apk" download style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                🤖 Download App
                            </a>
                        </li>
                    </ul>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Support</h4>
                    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.8, lineHeight: 1.8 }}>
                        <li>FAQ</li>
                        {settings?.contactEmail && (
                            <li>
                                <a href={`mailto:${settings.contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'inherit', textDecoration: 'none' }}>
                                    ✉️ Support Email
                                </a>
                            </li>
                        )}
                        <li>Contact Us</li>
                        <li><Link href="/terms-of-service">Terms of Service</Link></li>
                        <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                        <li style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <a href="https://wa.me/233551131139" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
                                👨‍💻 Contact Developer
                            </a>
                            <div style={{ fontSize: '1.2rem', opacity: 0.7, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <a href="mailto:abdulhananu077@gmail.com" title="Email Developer" style={{ textDecoration: 'none', color: 'inherit', transition: 'var(--transition)' }}>
                                    ✉️
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', opacity: 0.6, marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <p>
                    <Link href="/admin-login" style={{ textDecoration: 'none', color: 'inherit', cursor: 'default', padding: '2px' }}>
                        &copy;
                    </Link>{" "}
                    {new Date().getFullYear()} Card Hive Trading Center. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
