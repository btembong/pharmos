export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-primary mb-2">Return Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: June 2026</p>
      <div className="prose prose-sm max-w-none space-y-6 text-foreground">
        <section>
          <h2 className="text-lg font-semibold">Return Window</h2>
          <p className="text-muted-foreground">We accept returns within 30 days of delivery for unopened, undamaged products in original packaging. Items that have been opened or used cannot be returned.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Non-Returnable Items</h2>
          <p className="text-muted-foreground">The following items are non-returnable: opened or used products, refrigerated/temperature-sensitive items, and items marked as final sale.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">How to Return</h2>
          <p className="text-muted-foreground">To initiate a return, email <a href="mailto:support@pharmospeptide.com" className="text-accent hover:underline">support@pharmospeptide.com</a> with your order number and reason for return. We'll provide return instructions within 1–2 business days.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Refunds</h2>
          <p className="text-muted-foreground">Once we receive and inspect the return, refunds are processed within 5–7 business days to the original payment method. Shipping costs are non-refundable.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Damaged or Wrong Items</h2>
          <p className="text-muted-foreground">If you received a damaged or incorrect item, contact us within 7 days of delivery with a photo. We'll send a replacement or full refund at no cost to you.</p>
        </section>
      </div>
    </div>
  );
}
