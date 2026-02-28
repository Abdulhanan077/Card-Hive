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
        <header className="header">
            <div className="container header-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Link href="/" className="logo-container" onClick={closeMenu}>
                        <img src="/logo.png" alt="Card Hive Logo" className="header-logo-img" />
                        <span className="logo-slogan">Instant Cash for all Your Gift Cards</span>
                    </Link>

                    {/* Mobile Hamburger Button */}
                    <button
                        className="mobile-nav-toggle"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle navigation"
                    >
                        {isMenuOpen ? "✕" : "☰"}
                    </button>
                </div>

                <nav className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
                    <Link href="/#how-it-works" className="nav-link" onClick={closeMenu}>
                        How It Works
                    </Link>
                    <Link href="/#faq" className="nav-link" onClick={closeMenu}>
                        FAQ
                    </Link>
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
            </div>
        </header>
    );
}
