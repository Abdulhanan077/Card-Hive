import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy | MyCardHive",
  description: "Read our privacy policy to understand how we handle your data and ensure secure gift card trading.",
};

export default function PrivacyPolicy() {
  const toc = [
    { id: "collection", label: "1. Data We Collect" },
    { id: "processing", label: "2. How We Use Information" },
    { id: "legal-bases", label: "3. Legal Basis for Processing" },
    { id: "sharing", label: "4. Sharing & Transfers" },
    { id: "accounts", label: "5. Account Security" },
    { id: "protection", label: "6. Data Security & Storage" },
    { id: "minors", label: "7. Protection of Minors" },
    { id: "rights", label: "8. Your Privacy Controls" },
    { id: "tracking", label: "9. Tracking & Analytics" },
    { id: "updates", label: "10. Policy Evolution" },
    { id: "contact", label: "11. Get in Touch" },
  ];

  return (
    <>
      <Header />
      <LegalLayout title="Privacy Policy" lastUpdated="April 18, 2026" toc={toc}>
        <p>
          At <strong>MyCardHive</strong>, we prioritize your digital safety. This Privacy Policy outlines how our ecosystem ("<strong>the Service</strong>") handles your personal information when you interact with us across our web and mobile platforms.
        </p>
        <p>
          By utilizing MyCardHive for your gift card trading and USDT transactions, you trust us with your data. We are committed to transparency in our processing activities, ensuring you maintain full control over your privacy rights.
        </p>

        <section id="summary" className="summary-box">
          <h2 style={{ color: "var(--primary)" }}>Privacy Snapshot</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            A high-level overview of our data practices at MyCardHive.
          </p>

          <div className="summary-grid">
            <div className="summary-item">
              <h4>Information Scope</h4>
              <p>What do we collect?</p>
              <span>We focus on identifiers and financial data required to fulfill your trades and secure your account.</span>
            </div>

            <div className="summary-item">
              <h4>The Payout Flow</h4>
              <p>Is financial data safe?</p>
              <span>We use your wallet and mobile money details exclusively for transaction fulfillment. Your sensitive keys are never touched.</span>
            </div>

            <div className="summary-item">
              <h4>Your Power</h4>
              <p>Can I delete my data?</p>
              <span>Yes. You have the "Right to be Forgotten." You can anonymize your PII via your account settings at any time.</span>
            </div>
          </div>
        </section>

        <section id="collection">
          <h2>1. Data We Collect</h2>
          <p>
            The information we gather is essential for the functionality of the trading platform. This includes:
          </p>
          <ul>
            <li><strong>Biographical Identifiers</strong>: Username, email, and phone number used for account verification.</li>
            <li><strong>Transactional Data</strong>: Gift card codes, trade history, and digital copies of your assets.</li>
            <li><strong>Media Access</strong>: Photos you upload from your <strong>Photo Library</strong> or capture via your <strong>Camera</strong> (specifically images of your gift cards and payment receipts) to verify trade validity.</li>
            <li><strong>Financial Destinations</strong>: Mobile Money numbers and USDT wallet addresses for payouts.</li>
            <li><strong>Technical Meta-data</strong>: IP addresses and device identifiers used for fraud detection.</li>
          </ul>
        </section>

        <section id="processing">
          <h2>2. How We Use Information</h2>
          <p>
            We process your information for the following specific purposes:
          </p>
          <ul>
            <li>To verify the integrity of gift card submissions and prevent double-spending.</li>
            <li>To facilitate rapid payouts to your designated financial accounts.</li>
            <li>To protect our community from fraudulent actors and platform abuse.</li>
            <li>To provide personalized support through our real-time chat systems.</li>
          </ul>
        </section>

        <section id="legal-bases">
          <h2>3. Legal Basis for Processing</h2>
          <p>
            Our processing is grounded in the necessity of contract fulfillment. When you initiate a trade, we process your data to complete that transaction. We also rely on legitimate interests for platform security and your explicit consent for marketing communications.
          </p>
        </section>

        <section id="sharing">
          <h2>4. Sharing & Transfers</h2>
          <p>
            <strong>Your data is not for sale.</strong> We only share information with:
          </p>
          <ul>
            <li><strong>Payment Gateways</strong>: To send funds to your MTN or Telecel wallets.</li>
            <li><strong>Infrastructure Providers</strong>: Secure servers and databases that host our service.</li>
            <li><strong>Legal Authorities</strong>: Only when compelled by valid legal processes under Ghanaian law.</li>
          </ul>
        </section>

        <section id="accounts">
          <h2>5. Account Security</h2>
          <p>
            You are responsible for your account credentials. We provide advanced security features like Biometric Login on mobile to help you protect your assets. Always ensure you are using a unique, strong password.
          </p>
        </section>

        <section id="protection">
          <h2>6. Data Security & Storage</h2>
          <p>
            MyCardHive employs industry-standard encryption (AES-256) and secure SHA hashing for sensitive data. While we strive for absolute security, please remember that no digital transmission is entirely risk-free.
          </p>
        </section>

        <section id="rights">
          <h2>8. Your Privacy Controls</h2>
          <p>
            You have the right to request access to your data, correction of inaccuracies, and deletion of your profile. Our "Soft Delete" system allows you to scrub your PII while maintaining trade records for your own audit history.
          </p>
        </section>

        <section id="contact">
          <h2>11. Get in Touch</h2>
          <p>
            For any privacy-related inquiries, you can reach our data compliance team at:
          </p>
          <p>
            <strong>Email</strong>: support@mycardhive.com<br />
            <strong>Physical Address</strong>: Tamale, Ghana
          </p>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
