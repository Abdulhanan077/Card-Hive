import Link from "next/link";
import "./footer.css";

export default function Footer() {
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
                    </ul>
                </div>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ marginBottom: '1rem' }}>Support</h4>
                    <ul style={{ listStyle: 'none', padding: 0, opacity: 0.8, lineHeight: 1.8 }}>
                        <li>FAQ</li>
                        <li>Contact Us</li>
                        <li>Terms of Service</li>
                        <li style={{ marginTop: '0.5rem', opacity: 0.6 }}><Link href="/admin-login">Admin Portal</Link></li>
                    </ul>
                </div>
            </div>
            <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', opacity: 0.6, marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                <p>&copy; {new Date().getFullYear()} Card Hive Trading Center. All rights reserved.</p>
            </div>
        </footer>
    );
}
