import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import RatesCalculator from "@/components/RatesCalculator";
import styles from "./page.module.css";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  let settings = null;
  try {
    settings = await prisma.settings.findFirst();
  } catch (error) {
    console.warn("Could not connect to database for settings during build.");
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={`container ${styles.heroContainer}`}>
            <div className={styles.heroContent}>
              <div className="badge badge-success" style={{ marginBottom: "1rem" }}>
                Trusted by 5,000+ traders in Ghana
              </div>
              <h1 className={styles.title}>
                Trade your Gift Cards for Instant Cash.
              </h1>
              <p className={styles.subtitle}>
                {settings?.landingPageIntroText ||
                  "Sell your gift cards for instant cash payouts via MTN & Telecel. No complicated processes, just straightforward trading."}
              </p>
              <div className={styles.heroActions}>
                <Link href="/login" className="btn btn-primary">
                  Sell Your Gift Card
                </Link>
                <Link href="#how-it-works" className="btn btn-secondary">
                  How it works
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <RatesCalculator />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <h2>How it works</h2>
              <p>Three simple steps to get paid instantly.</p>
            </div>
            <div className={styles.stepsGrid}>
              <div className="card">
                <div className={styles.stepNumber}>1</div>
                <h3>Sign up & Log in</h3>
                <p>
                  Create a free account or log in if you already have one to
                  securely track your trades and payouts.
                </p>
              </div>
              <div className="card">
                <div className={styles.stepNumber}>2</div>
                <h3>Submit Details</h3>
                <p>
                  Provide your card details, upload the pictures, and enter your
                  MTN or Telecel mobile money number.
                </p>
              </div>
              <div className="card">
                <div className={styles.stepNumber}>3</div>
                <h3>Get Paid</h3>
                <p>
                  We review your card immediately and send the cash directly to
                  your mobile money account once verified.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className={`${styles.section} ${styles.bgLight}`}>
          <div className="container text-center" style={{ textAlign: "center" }}>
            <h2>Why trade with Card Hive?</h2>
            <div className={styles.featuresGrid} style={{ marginTop: "3rem" }}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>⚡</div>
                <h4>Lightning Fast</h4>
                <p>Payments take minutes, not days.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>🔒</div>
                <h4>Secure Hashes</h4>
                <p>Your card details are protected and we strictly block duplicates.</p>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>🇬🇭</div>
                <h4>Local Payments</h4>
                <p>Direct payouts to your MTN or Telecel wallet.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
