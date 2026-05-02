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

        {/* Mobile App Section */}
        <section className={styles.appSection}>
          <div className={`container ${styles.appContainer}`}>
            <div className={styles.appContent}>
              <div className="badge badge-primary" style={{ marginBottom: "1rem" }}>
                MyCardHive Mobile
              </div>
              <h2>Take MyCardHive Everywhere.</h2>
              <p>
                Download our official mobile app for iOS or Android for a faster trading experience,
                instant push notifications, and biometric security.
              </p>
              <div className={styles.appActions} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <a href="https://apps.apple.com/us/app/mycardhive/id6764374592" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: '180px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🍏</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: 1 }}>Download on the</div>
                    <div style={{ fontWeight: 'bold' }}>App Store</div>
                  </div>
                </a>
                <a href="https://pub-8f7cbf9bd50641448937a36053e003af.r2.dev/card-hive.apk" download className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: '180px', backgroundColor: 'var(--surface)', color: 'var(--foreground)' }}>
                  <span style={{ fontSize: '1.4rem' }}>🤖</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, lineHeight: 1 }}>Download for</div>
                    <div style={{ fontWeight: 'bold' }}>Android APK</div>
                  </div>
                </a>
              </div>
            </div>
            <div className={styles.appVisual}>
              <div className={styles.phoneMockup}>
                <div className={styles.phoneScreen}>
                  <img src="/logo.png" alt="App Preview" style={{ width: '100px', opacity: 0.2 }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className={`${styles.section} ${styles.bgLight}`}>
          <div className="container text-center" style={{ textAlign: "center" }}>
            <h2>Why trade with MyCardHive?</h2>
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

