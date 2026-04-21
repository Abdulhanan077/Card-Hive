import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Account Deletion | MyCardHive",
  description: "Learn how to delete your MyCardHive account and associated data.",
};

export default function AccountDeletion() {
  const toc = [
    { id: "method-1", label: "1. Deletion via App" },
    { id: "method-2", label: "2. Deletion via Support" },
    { id: "data-retention", label: "3. What Data is Deleted" },
    { id: "policy", label: "4. Data Retention Policy" },
  ];

  return (
    <>
      <Header />
      <LegalLayout title="Account Deletion Request" lastUpdated="April 21, 2026" toc={toc}>
        <p>
          At <strong>MyCardHive</strong>, we respect your right to privacy and the control over your personal data. This page provides clear instructions on how you can request the deletion of your account and any associated personal information.
        </p>

        <section id="method-1">
          <h2>1. Deletion via the Mobile App</h2>
          <p>
            The fastest way to delete your account is directly through the MyCardHive mobile application:
          </p>
          <ol>
            <li>Open the <strong>MyCardHive</strong> app and log in.</li>
            <li>Navigate to the <strong>Settings</strong> or <strong>Profile</strong> tab.</li>
            <li>Scroll to the bottom and tap on <strong>Delete Account</strong>.</li>
            <li>Confirm your choice. Your personal identifiers will be scrubbed immediately.</li>
          </ol>
        </section>

        <section id="method-2">
          <h2>2. Deletion via Email Support</h2>
          <p>
            If you no longer have the app installed or cannot access your account, you can request manual deletion by contacting our support team:
          </p>
          <ul>
            <li><strong>Email</strong>: support@mycardhive.com</li>
            <li><strong>Subject</strong>: Account Deletion Request - [Your Username]</li>
          </ul>
          <p>
            Please send the email from the address associated with your MyCardHive account. Our team will verify your identity and process the request within 48-72 hours.
          </p>
        </section>

        <section id="data-retention">
          <h2>3. What Data is Deleted</h2>
          <p>
            Upon a successful deletion request:
          </p>
          <ul>
            <li>Your <strong>Personal Identifiable Information (PII)</strong>, including your name, email, and phone number, will be permanently removed or anonymized.</li>
            <li>Your <strong>payout destinations</strong> (Mobile Money numbers/Wallets) will be removed.</li>
            <li>Your <strong>profile picture</strong> and biometric data references will be cleared.</li>
          </ul>
        </section>

        <section id="policy">
          <h2>4. Data Retention Policy</h2>
          <p>
            Please note that <strong>transactional records</strong> (gift card codes submitted and payout history) may be retained for a period of up to 5 years as required by the <strong>Anti-Money Laundering (AML)</strong> laws of Ghana. These records will be detached from your personal identity and kept only for regulatory compliance and audit purposes.
          </p>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
