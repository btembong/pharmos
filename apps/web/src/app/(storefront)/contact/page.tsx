import { apiClient } from "@/lib/api-client";
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { ContactForm } from "@/components/storefront/contact-form";

export const revalidate = 300;

async function getSiteSettings(): Promise<Record<string, string>> {
  try {
    const res = await apiClient<{ data: Record<string, string> }>("/api/settings/site");
    return res.data || {};
  } catch {
    return {};
  }
}

export default async function ContactPage() {
  const s = await getSiteSettings();

  const phone = s["contact_phone"] || "+1 (800) 555-0100";
  const email = s["contact_email"] || "support@pharmos.com";
  const hours = s["contact_hours"] || "Mon–Fri 9am–6pm ET";
  const address = s["contact_address"] || "123 Health Ave, Suite 100, New York, NY 10001";
  const response = s["contact_response"] || "We respond within 24 hours";
  const mapUrl = s["contact_map_url"] || "";

  const infoItems = [
    { icon: Phone, label: "Phone", value: phone, href: `tel:${phone.replace(/\D/g, "")}` },
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}` },
    { icon: Clock, label: "Hours", value: hours, href: null },
    { icon: MapPin, label: "Address", value: address, href: null },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#010128] px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7371FC]/20">
            <MessageCircle className="h-7 w-7 text-[#A594F9]" />
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-5xl">Get in Touch</h1>
          <p className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg">
            Have a question about an order, a product, or need pharmacist guidance? We&apos;re here to help.
          </p>
          <p className="mt-2 text-sm text-[#A594F9]">{response}</p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Left — info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#010128]">Contact Information</h2>
              <p className="mt-1 text-sm text-muted-foreground">Reach us through any of these channels.</p>
            </div>

            <div className="space-y-3">
              {infoItems.map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="flex items-start gap-4 rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7371FC]/10">
                    <Icon className="h-4 w-4 text-[#7371FC]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    {href ? (
                      <a href={href} className="mt-0.5 block text-sm font-medium text-[#010128] hover:text-[#7371FC] hover:underline">{value}</a>
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-[#010128]">{value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            {s["whatsapp_number"] && (
              <a
                href={`https://wa.me/${s["whatsapp_number"].replace(/\D/g, "")}?text=${encodeURIComponent(s["whatsapp_greeting"] || "Hi Pharmos!")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#25D366] px-5 py-3.5 text-white shadow-md transition-all hover:bg-[#22c55e] hover:shadow-lg"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div>
                  <p className="text-sm font-bold">Chat on WhatsApp</p>
                  <p className="text-xs text-white/80">Quick replies, usually within minutes</p>
                </div>
              </a>
            )}

            {/* Trust */}
            <div className="flex items-center gap-2 rounded-xl border border-[#7371FC]/20 bg-[#F5EFFF] px-4 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#7371FC]" />
              <p className="text-xs text-muted-foreground">Licensed US Pharmacy — your questions are handled by qualified pharmacists.</p>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-[#010128]">Send Us a Message</h2>
              <p className="mt-1 text-sm text-muted-foreground">Fill out the form and we&apos;ll get back to you shortly.</p>
              <div className="mt-6">
                <ContactForm supportEmail={email} />
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        {mapUrl && (
          <div className="mt-10 overflow-hidden rounded-2xl border shadow-sm">
            <iframe src={mapUrl} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Our location" />
          </div>
        )}
      </div>
    </div>
  );
}
