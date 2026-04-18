import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service | Card-Hive",
  description: "Read our terms of service to understand the rules and guidelines for trading gift cards and USDT on Card-Hive.",
};

export default function TermsOfService() {
  const toc = [
    { id: "usage", label: "1. Usage & Eligibility" },
    { id: "trading", label: "2. Trading Protocol" },
    { id: "payouts", label: "3. Payout Guarantee" },
    { id: "guidelines", label: "4. Community Guidelines" },
    { id: "liability", label: "5. Liability & Risk" },
    { id: "jurisdiction", label: "6. Legal Jurisdiction" },
  ];

  return (
    <>
      <Header />
      <LegalLayout title="Terms of Service" lastUpdated="April 18, 2026" toc={toc}>
        <p>
          Welcome to <strong>Card-Hive</strong>. These Terms of Service ("<strong>the Rules</strong>") establish a binding agreement between you and our trading platform. By accessing our dashboard or mobile app, you acknowledge that you have read and accepted these terms in their entirety.
        </p>

        <section id="summary" className="summary-box">
          <h2 style={{ color: "var(--primary)" }}>Terms at a Glance</h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
            A simplified overview of your rights and responsibilities.
          </p>

          <div className="summary-grid">
            <div className="summary-item">
              <h4>Eligibility</h4>
              <p>Who can use it?</p>
              <span>Anyone 18+ who legally owns the assets they wish to trade.</span>
            </div>

            <div className="summary-item">
              <h4>The Rule of One</h4>
              <p>Account policy?</p>
              <span>One user, one account. Duplicate profiles for bonus exploitation are banned.</span>
            </div>

            <div className="summary-item">
              <h4>Finality</h4>
              <p>Can I cancel?</p>
              <span>Once a trade is processed and paid, the transaction is irreversible.</span>
            </div>
          </div>
        </section>

        <section id="usage">
          <h2>1. Usage & Eligibility</h2>
          <p>
            To use Card-Hive, you must be 18+ and provide accurate identification details. We reserve the right to suspend any account that provides false or misleading information. You are solely responsible for the actions performed through your account.
          </p>
        </section>

        <section id="contact">
          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            <strong>Email</strong>: support@mycardhive.com<br />
            <strong>Physical Address</strong>: Tamale, Ghana
          </p>
        </section>

        <section id="trading">
          <h2>2. Trading Protocol</h2>
          <p>
            When trading on our platform, you agree to the following:
          </p>
          <ul>
            <li><strong>Legal Ownership</strong>: You warrant that any asset you submit was obtained through legal means.</li>
            <li><strong>Code Integrity</strong>: You will not submit cards that have already been redeemed or reported as lost/stolen.</li>
            <li><strong>Verification Rights</strong>: Card-Hive team has the final say in card verification outcomes.</li>
          </ul>
        </section>

        <section id="payouts">
          <h2>3. Payout Guarantee</h2>
          <p>
            We guarantee payouts for all verified trades. However, <strong>you must ensure the accuracy of your Mobile Money number or USDT address.</strong>
          </p>
          <p>
            Funds sent to an incorrect destination due to user error cannot be retrieved. All confirmed payments are final.
          </p>
        </section>

        <section id="guidelines">
          <h2>4. Community Guidelines</h2>
          <p>
            Card-Hive is a professional trading community. Users are prohibited from using offensive language in support chats or attempting to bypass our security systems through scripted attacks or exploitation.
          </p>
        </section>

        <section id="liability">
          <h2>5. Liability & Risk</h2>
          <p>
            Card-Hive is an intermediary platform. We are not responsible for fluctuations in market rates or technical failures on the side of network providers (MTN, Telecel, etc.). Our liability is limited to the value of the trade in question.
          </p>
        </section>

        <section id="jurisdiction">
          <h2>6. Legal Jurisdiction</h2>
          <p>
            These rules are governed by the laws of <strong>Ghana</strong>. Any disputes that cannot be settled amicably will be resolved in the competent courts of Accra.
          </p>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
