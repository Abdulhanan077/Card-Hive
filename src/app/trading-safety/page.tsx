import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Trading Safety | Secure Gift Card Exchange",
  description: "Learn how to trade safely, protect your digital assets, and avoid common scams when selling gift cards on MyCardHive.",
};

export default function TradingSafetyPage() {
  const toc = [
    { id: "principles", label: "Core Safety Principles" },
    { id: "common-scams", label: "Avoid Common Scams" },
    { id: "secure-accounts", label: "Keep Your Account Secure" },
    { id: "verification", label: "Verification Best Practices" },
  ];

  return (
    <>
      <Header />
      <LegalLayout 
        title="Trading Safety & Protection" 
        lastUpdated="April 19, 2026" 
        toc={toc}
      >
        <section id="principles">
          <h2>Core Safety Principles</h2>
          <p>
            At <strong>MyCardHive</strong>, your security is our top priority. We provide a managed environment for gift card trading, but users must also practice good security habits to ensure a smooth and safe transaction experience.
          </p>
          <ul>
            <li><strong>Official Channels Only</strong>: Only communicate with and trade through the official MyCardHive app or website. We will never ask for your password via WhatsApp or email.</li>
            <li><strong>Keep Your Receipt</strong>: Always keep the physical or digital receipt of your gift card until the trade is fully paid out.</li>
            <li><strong>Immediate Use</strong>: Once you have uploaded a card to MyCardHive, do not attempt to sell it on other platforms simultaneously. This leads to account suspensions.</li>
          </ul>
        </section>

        <section id="common-scams" className="summary-box" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <h2 style={{ color: "var(--danger)" }}>Avoid Common Scams</h2>
          <p>
            The gift card market is often targeted by scammers. Protect yourself by recognizing these red flags:
          </p>
          <ul>
            <li><strong>Off-Platform Requests</strong>: Be wary of anyone asking you to cancel a trade on the app and finish it via private chat.</li>
            <li><strong>Impatience</strong>: If an administrator or support person is pressuring you to act faster than the standard verification time, verify their identity via the official support email.</li>
            <li><strong>Middlemen</strong>: MyCardHive is a direct trade platform. We do not use "agents" or "middlemen" to process trades.</li>
          </ul>
        </section>

        <section id="secure-accounts">
          <h2>Keep Your Account Secure</h2>
          <p>
            Use a unique, strong password for your MyCardHive account. Do not reuse passwords from other services. If you suspect your account has been compromised, use the "Security" settings in the app to change your password immediately and contact support.
          </p>
        </section>

        <section id="verification">
          <h2>Verification Best Practices</h2>
          <p>
            To ensure your card is verified quickly and safely:
          </p>
          <ul>
            <li><strong>Clear Photos</strong>: Ensure the card code and serial number are perfectly legible. Blurry images cause delays.</li>
            <li><strong>Full Card</strong>: Include the entire card in the frame, not just the code.</li>
            <li><strong>No Edits</strong>: Do not use photo editing software to "enhance" your card images. Our scanners will flag edited images as suspicious.</li>
          </ul>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
