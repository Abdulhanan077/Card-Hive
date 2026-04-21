import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LegalLayout from "@/components/LegalLayout";

export const metadata = {
  title: "FAQ | MyCardHive Help Center",
  description: "Frequently asked questions about gift card trading and payout methods (MTN, Telecel, AT, USDT) on MyCardHive.",
};

export default function FAQPage() {
  const faqItems = [
    {
      id: "basics",
      label: "The Basics",
      questions: [
        {
          q: "What is MyCardHive?",
          a: "MyCardHive is a premium platform specializing in gift card trading. We provide instant verification and fast payouts for your global gift cards directly to your preferred payment method."
        },
        {
          q: "How do I start trading?",
          a: "Simply create an account, go to the 'Sell Card' screen, choose your card type, and upload the images/details. Our administrators will verify the card and process your payment immediately."
        }
      ]
    },
    {
      id: "payments",
      label: "Payments & Payouts",
      questions: [
        {
          q: "How long does verification take?",
          a: "Most trades are verified within 5 to 15 minutes. High-volume cards or those requiring manual merchant verification may take up to 30 minutes."
        },
        {
          q: "Which payout methods are supported?",
          a: "We support various payout methods including MTN Mobile Money, Telecel Cash, AT Money, and professional USDT transfers."
        }
      ]
    },
    {
      id: "security",
      label: "Security & Safety",
      questions: [
        {
          q: "Is my data secure?",
          a: "Yes. We use industry-standard encryption to protect your data. We do not store your raw card codes; they are hashed and securely processed."
        },
        {
          q: "What should I do if my trade is rejected?",
          a: "If a trade is rejected, check the reason provided in the Trade Details screen. Common reasons include blurry images, already-used codes, or incorrect region selection. You can reach out to support for more details."
        }
      ]
    }
  ];

  return (
    <>
      <Header />
      <LegalLayout 
        title="Frequently Asked Questions" 
        lastUpdated="April 19, 2026" 
        toc={faqItems.map(section => ({ id: section.id, label: section.label }))}
      >
        {faqItems.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.label}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '1.5rem' }}>
              {section.questions.map((item, index) => (
                <div key={index} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.75rem' }}>
                    Q: {item.q}
                  </h3>
                  <p style={{ lineHeight: '1.6', opacity: 0.85 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </LegalLayout>
      <Footer />
    </>
  );
}
