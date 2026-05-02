"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import "./header.css";

export default function Header() {
    const { data: session } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className="header" style={{ zIndex: 1000 }}>
            <div className="container header-container">
                <Link href="/" className="logo-container" onClick={closeMenu}>
                    <img src="/logo.png" alt="MyCardHive Logo" className="header-logo-img" />
                    <span className="logo-slogan">Instant Cash for All Your Gift Cards</span>
                </Link>

                <nav className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
                    <Link href="/rates" className="nav-link" onClick={closeMenu}>
                        Rates
                    </Link>
                    <Link href="/#how-it-works" className="nav-link" onClick={closeMenu}>
                        How It Works
                    </Link>
                    <Link href="/#faq" className="nav-link" onClick={closeMenu}>
                        FAQ
                    </Link>
                    <Link href="/check-balance" className="nav-link" onClick={closeMenu}>
                        Check Balance
                    </Link>
                    <a href="https://pub-8f7cbf9bd50641448937a36053e003af.r2.dev/card-hive.apk" download className="nav-link" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        Android 🤖
                    </a>
                    <a href="https://apps.apple.com/us/app/mycardhive/id6764374592" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                        iOS 🍏
                    </a>
                    {session ? (
                        <>
                            <Link
                                href={session.user.role === "ADMIN" ? "/admin" : "/user"}
                                className="nav-link"
                                onClick={closeMenu}
                            >
                                Dashboard
                            </Link>
                            <button onClick={() => { closeMenu(); signOut(); }} className="btn btn-secondary nav-btn-mobile">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="nav-link" onClick={closeMenu}>
                                Login
                            </Link>
                            <Link href="/register" className="btn btn-primary nav-btn-mobile" onClick={closeMenu}>
                                Sign Up
                            </Link>
                        </>
                    )}
                </nav>

                {/* Mobile Hamburger Button */}
                <button
                    className="mobile-nav-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle navigation"
                >
                    {isMenuOpen ? "✕" : "☰"}
                </button>
            </div>
        </header>
    );
}

