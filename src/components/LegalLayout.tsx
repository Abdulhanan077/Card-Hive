"use client";

import Link from "next/link";
import "./legal.css";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  toc: { id: string; label: string }[];
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, toc, children }: LegalLayoutProps) {
  return (
    <div className="container" style={{ paddingTop: "120px", paddingBottom: "100px" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "0.5rem" }}>
        {title}
      </h1>
      <p style={{ marginBottom: "3rem", opacity: 0.6 }}>Last Updated: {lastUpdated}</p>

      <div className="legal-container">
        <aside className="legal-sidebar">
          <h3>Table of Contents</h3>
          <nav>
            <ul className="legal-nav">
              <li>
                <Link href="#summary">Summary of Key Points</Link>
              </li>
              {toc.map((item) => (
                <li key={item.id}>
                  <Link href={`#${item.id}`}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="legal-content">
          {children}
        </article>
      </div>
    </div>
  );
}
