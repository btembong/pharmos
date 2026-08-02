export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-lg font-semibold">Acceptance of Terms</h2>
          <p className="text-muted-foreground">By accessing or using Pharmos Peptide & OTC, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Products & Orders</h2>
          <p className="text-muted-foreground">All products are sold for research and personal use only. We reserve the right to refuse or cancel any order at our discretion. Product availability is subject to change without notice.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="text-muted-foreground">Orders must be paid in full before shipment. We accept Zelle, Venmo, CashApp, wire transfer, and card payments via TranZak. Orders unpaid within 48 hours may be cancelled.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Shipping</h2>
          <p className="text-muted-foreground">We ship within the continental United States. Delivery times are estimates and not guaranteed. Risk of loss passes to the customer upon delivery to the carrier.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Limitation of Liability</h2>
          <p className="text-muted-foreground">Pharmos Peptide & OTC is not liable for any indirect, incidental, or consequential damages arising from the use of our products or services.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="text-muted-foreground">Questions? Email <a href="mailto:support@pharmospeptide.com" className="text-accent hover:underline">support@pharmospeptide.com</a>.</p>
        </section>
      </div>
    </div>
  );
}
