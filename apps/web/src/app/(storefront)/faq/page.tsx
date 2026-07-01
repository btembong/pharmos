export default function FAQPage() {
  const faqs = [
    {
      q: "How do I place an order?",
      a: "Browse our products, add items to your cart, and proceed to checkout. You'll receive an order confirmation email with payment instructions.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We accept Zelle, Venmo, CashApp, wire transfer, and card payments via TranZak. Payment instructions are shown after you place your order.",
    },
    {
      q: "How long does shipping take?",
      a: "Standard shipping takes 3–7 business days within the continental US. Express options (1–2 days) are available at checkout.",
    },
    {
      q: "Do you ship internationally?",
      a: "Currently we ship within the United States only. International shipping is not available at this time.",
    },
    {
      q: "How do I track my order?",
      a: "Once your order is dispatched, you'll receive a tracking number via email and SMS. You can also track your order at /track using your order number.",
    },
    {
      q: "Can I return a product?",
      a: "Yes — unopened, undamaged products can be returned within 30 days of delivery. See our Return Policy for full details.",
    },
    {
      q: "Are your products FDA approved?",
      a: "OTC products are regulated by the FDA. Supplements and peptides are sold for research purposes. Please read the product page disclaimers carefully.",
    },
    {
      q: "Do I need a prescription?",
      a: "OTC products do not require a prescription. Prescription-required products are currently not available for online purchase — contact us for assistance.",
    },
    {
      q: "How do I contact customer support?",
      a: "Email us at support@pharmospeptide.com. We respond within 1–2 business days.",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">Frequently Asked Questions</h1>
      <p className="text-sm text-muted-foreground mb-10">Can't find what you're looking for? Email us at support@pharmospeptide.com</p>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <div key={i} className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-primary">{faq.q}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
