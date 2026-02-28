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
                    <h3>🛍️ Card Hive</h3>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Quick Links</h4>
                    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.8, lineHeight: 1.8 }}>
                        <li><Link href="/">Home</Link></li>
                        <li><Link href="/login">Sign In</Link></li>
                        <li><Link href="/register">Create Account</Link></li>
                        <li style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                            <a href="https://wa.me/233551131139" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                👨‍💻 Contact Developer
                            </a>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '2px' }}>
                                <a href="mailto:abdulhananu077@gmail.com" style={{ textDecoration: 'none', color: 'inherit' }}>
                                    abdulhananu077@gmail.com
                                </a>
                            </div>
                        </li>
                    </ul>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Support</h4>
                    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.8, lineHeight: 1.8 }}>
                        <li>FAQ</li>
                        <li>
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                Contact Us
                            </a>
                        </li>
                        <li>Terms of Service</li>
                    </ul>
                </div>
            </div>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', opacity: 0.6, marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <p>
                    &copy; {new Date().getFullYear()} Card Hive Trading Center. All rights reserved. {" "}
                    <Link href="/admin-login" style={{ textDecoration: 'none', color: 'inherit', fontStyle: 'italic', cursor: 'default' }}>
                        .
                    </Link>
                </p>
            </div>
        </footer>
    );
}
