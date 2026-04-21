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

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-container">
                    {/* Brand Section */}
                    <div className="footer-brand">
                        <Link href="/">
                            <img src="/logo.png" alt="MyCardHive Logo" className="header-logo-img" />
                        </Link>
                        <p className="footer-about">
                            The most trusted platform for secure gift card trading. Get premium rates and instant payouts via MTN, Telecel, AT, or USDT.
                        </p>
                        <div className="footer-socials">
                            <a href="#" className="social-icon" aria-label="Follow us on X">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.045 4.126H5.078z"/></svg>
                            </a>
                            <a href="#" className="social-icon" aria-label="Follow us on Instagram">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            </a>
                        </div>
                    </div>

                    {/* Platform Column */}
                    <div className="footer-column">
                        <h4>Platform</h4>
                        <ul className="footer-links">
                            <li><Link href="/" className="footer-link-item">Home</Link></li>
                            <li><Link href="/login" className="footer-link-item">Sign In</Link></li>
                            <li><Link href="/register" className="footer-link-item">Create Account</Link></li>
                            <li style={{ marginTop: '0.5rem' }}>
                                <a href="https://pub-8f7cbf9bd50641448937a36053e003af.r2.dev/card-hive.apk" download className="footer-link-item" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                                    <span className="footer-icon-box">📲</span> Download App
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Support Column */}
                    <div className="footer-column">
                        <h4>Support</h4>
                        <ul className="footer-links">
                            <li><Link href="/contact" className="footer-link-item">Contact Us</Link></li>
                            <li><Link href="/faq" className="footer-link-item">Frequently Asked Questions</Link></li>
                            {settings?.contactEmail && (
                                <li>
                                    <a href={`mailto:${settings.contactEmail}`} className="footer-link-item">
                                        <span className="footer-icon-box">✉️</span> Support Email
                                    </a>
                                </li>
                            )}
                            <li>
                                <a href="https://wa.me/233551131139" target="_blank" rel="noopener noreferrer" className="footer-link-item">
                                    <span className="footer-icon-box">💬</span> WhatsApp Support
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal Column */}
                    <div className="footer-column">
                        <h4>Legal</h4>
                        <ul className="footer-links">
                            <li><Link href="/terms-of-service" className="footer-link-item">Terms of Service</Link></li>
                            <li><Link href="/privacy-policy" className="footer-link-item">Privacy Policy</Link></li>
                            <li><Link href="/trading-safety" className="footer-link-item">Trading Safety</Link></li>
                            <li><Link href="/aml-policy" className="footer-link-item">AML Policy</Link></li>
                            <li><Link href="/account-deletion" className="footer-link-item">Account Deletion</Link></li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <div className="footer-copyright">
                        <Link href="/admin-login" style={{ opacity: 1, color: 'inherit' }}>&copy;</Link> {new Date().getFullYear()} MyCardHive Trading Center. All rights reserved.
                    </div>
                    
                    <a href="https://wa.me/233551131139" target="_blank" rel="noopener noreferrer" className="footer-dev">
                        Built with <span className="footer-dev-heart">❤</span> for the Trading Community
                    </a>
                </div>
            </div>
        </footer>
    );
}

