import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "Contact Us | MyCardHive Support",
  description: "Get in touch with the MyCardHive support team for assistance with your gift card trades.",
};

export default function ContactPage() {
  const toc = [
    { id: "support", label: "Support Channels" },
    { id: "whatsapp", label: "WhatsApp Support" },
    { id: "email", label: "Email Support" },
    { id: "location", label: "Our Location" },
  ];

  return (
    <>
      <Header />
      <LegalLayout title="Contact Support" lastUpdated="April 19, 2026" toc={toc}>
        <section id="support">
          <h2>Direct Support Channels</h2>
          <p>
            At <strong>MyCardHive</strong>, we pride ourselves on providing rapid, personalized support for our trading community. If you have any questions about an ongoing trade, a rejected card, or a payout, please reach out via one of the channels below.
          </p>
        </section>

        <section id="whatsapp" className="summary-box" style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
          <h2 style={{ color: "#10B981" }}>WhatsApp Support (Fastest)</h2>
          <p>
            For the quickest response times, we recommend contacting our lead administrator directly on WhatsApp. We are generally available 24/7 for trade verifications.
          </p>
          <a 
            href="https://wa.me/233551131139" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ background: "#10B981", border: "none", marginTop: "1rem" }}
          >
            Chat on WhatsApp
          </a>
        </section>

        <section id="email">
          <h2>Email Support</h2>
          <p>
            For formal inquiries, data deletion requests, or technical support, please email our support desk:
          </p>
          <p style={{ fontWeight: "bold", color: "var(--primary)" }}>
            support@mycardhive.com
          </p>
        </section>

        <section id="location">
          <h2>Our Location</h2>
          <p>
            MyCardHive is headquartered in the Northern Region of Ghana:
          </p>
          <p>
            <strong>Address</strong>: Tamale, Ghana<br />
            <strong>Operating Hours</strong>: 24/7 Digital Operations
          </p>
        </section>

        <section id="admin">
          <h2>Administrative Support</h2>
          <p>
            Users can also initiate a real-time chat with administrators directly within any active trade detail screen in the mobile app.
          </p>
        </section>
      </LegalLayout>
      <Footer />
    </>
  );
}
