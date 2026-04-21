import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "AML Policy | Anti-Money Laundering",
  description: "MyCardHive's commitment to preventing money laundering and financial crime through strict KYC and transaction monitoring.",
};

export default function AMLPolicyPage() {
  const toc = [
    { id: "overview", label: "Policy Overview" },
    { id: "verification", label: "User Verification (KYC)" },
    { id: "monitoring", label: "Transaction Monitoring" },
    { id: "reporting", label: "Reporting of Suspicious Activity" },
  ];

  return (
    <>
      <Header />
      <LegalLayout 
        title="Anti-Money Laundering (AML) Policy" 
        lastUpdated="April 19, 2026" 
        toc={toc}
      >
        <section id="overview">
          <h2>Policy Overview</h2>
          <p>
            <strong>MyCardHive</strong> is committed to the highest standards of financial integrity and anti-money laundering (AML) compliance. We strictly prohibit the use of our platform for money laundering, terrorist financing, or any other illegal financial activity.
          </p>
          <p>
            Our AML framework is designed to detect, prevent, and report suspicious activities in accordance with international standards and local regulations in the regions we operate, specifically Ghana.
          </p>
        </section>

        <section id="verification">
          <h2>User Verification (KYC)</h2>
          <p>
            "Know Your Customer" (KYC) is a central part of our AML strategy. We require all users to provide accurate personal information during registration.
          </p>
          <ul>
            <li><strong>Identification</strong>: We verify user emails and phone numbers.</li>
            <li><strong>Enhanced Due Diligence</strong>: High-volume traders may be required to provide government-issued identification or proof of source of funds.</li>
            <li><strong>Age Requirement</strong>: Users must be at least 18 years old to use the platform.</li>
          </ul>
        </section>

        <section id="monitoring">
          <h2>Transaction Monitoring</h2>
          <p>
            Every trade performed on MyCardHive is monitored for suspicious patterns. This includes, but is not limited to:
          </p>
          <ul>
            <li>Unusually large gift card submissions without clear provenance.</li>
            <li>Multiple accounts linked to the same payout information.</li>
            <li>Rapid, high-frequency card uploads that exceed normal consumer behavior.</li>
          </ul>
          <p>
            We reserve the right to freeze accounts and withhold payouts while a manual investigation of suspicious transactions is conducted.
          </p>
        </section>

        <section id="reporting">
          <h2>Reporting of Suspicious Activity</h2>
          <p>
            MyCardHive cooperates fully with law enforcement and financial regulatory authorities. In the event that we identify clear evidence of criminal activity, we will report said activity to the relevant authorities, including the Financial Intelligence Centre (FIC) of Ghana when applicable.
          </p>
          <p>
            We maintain detailed logs of all transactions, including IP addresses, card details, and payout destinations, for a minimum of five years.
          </p>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
