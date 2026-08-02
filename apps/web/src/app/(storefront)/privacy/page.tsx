export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <p className="text-muted-foreground">We collect information you provide when creating an account, placing an order, or contacting us — including your name, email address, shipping address, and phone number.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">How We Use Your Information</h2>
          <p className="text-muted-foreground">We use your information to process and fulfill orders, send order confirmations and shipping updates, respond to customer service inquiries, and improve our services.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Information Sharing</h2>
          <p className="text-muted-foreground">We do not sell your personal information. We share data only with shipping carriers to fulfill your order and with payment processors to complete transactions.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Data Security</h2>
          <p className="text-muted-foreground">We use industry-standard security measures to protect your personal information. All data is transmitted over encrypted HTTPS connections.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Contact Us</h2>
          <p className="text-muted-foreground">For privacy-related questions, contact us at <a href="mailto:support@pharmospeptide.com" className="text-accent hover:underline">support@pharmospeptide.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
