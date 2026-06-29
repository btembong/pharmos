import { apiClient } from "@/lib/api-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  TriangleAlert,
  FlaskConical,
  Microscope,
  ExternalLink,
  Download,
  ChevronRight,
  Thermometer,
  Package,
  Tag,
  Globe,
  Hash,
  Beaker,
  Award,
} from "lucide-react";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { AvailabilityBadge } from "@/components/storefront/availability-badge";
import { DeliveryEstimateWidget } from "@/components/storefront/delivery-estimate";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { ResearchDisclaimerGate } from "@/components/storefront/research-disclaimer-gate";
import { ImageZoom } from "@/components/storefront/image-zoom";
import { RelatedProducts, FrequentlyBoughtTogether } from "@/components/storefront/related-products";
import { StickyMobileATC } from "@/components/storefront/sticky-mobile-atc";

export const revalidate = 300;

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  genericName: string | null;
  brandName: string | null;
  description: string | null;
  shortDescription: string | null;
  activeIngredients: { name: string; strength: string; unit: string }[] | null;
  dosageForm: string | null;
  strength: string | null;
  packSize: string | null;
  manufacturer: string | null;
  countryOfOrigin: string | null;
  ndcNumber: string | null;
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  isResearchCompound: boolean;
  purityPercent: number | null;
  molecularWeight: string | null;
  aminoAcidSequence: string | null;
  casNumber: string | null;
  coaUrl: string | null;
  vialSizeMg: string | null;
  storageConditions: string | null;
  images: { url: string; alt: string; isPrimary: boolean }[] | null;
  category: { id: string; name: string; slug: string } | null;
  prices: { amount: string; priceType: string; currency: string }[];
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product: ProductDetail | null = null;

  try {
    const result = await apiClient<{ data: ProductDetail }>(`/api/products/${slug}`);
    product = result.data;
  } catch {
    notFound();
  }

  if (!product) notFound();

  const isResearch = product.isResearchCompound;
  const price = product.prices?.find((p) => p.priceType === "b2c");
  const primaryImage = product.images?.find((i) => i.isPrimary) ?? product.images?.[0] ?? null;
  const otherImages = product.images?.filter((i) => i !== primaryImage).slice(0, 4) ?? [];

  // Spec rows — only those with a value are rendered
  const specRows = [
    { icon: Hash,         label: "CAS Number",       value: product.casNumber },
    { icon: Beaker,       label: "Molecular Weight",  value: product.molecularWeight },
    { icon: Award,        label: "Purity (HPLC)",     value: product.purityPercent != null ? `≥${product.purityPercent}%` : null },
    { icon: FlaskConical, label: "Vial Size",         value: product.vialSizeMg },
    { icon: Tag,          label: "Dosage Form",       value: product.dosageForm },
    { icon: Tag,          label: "Strength",          value: product.strength },
    { icon: Package,      label: "Pack Size",         value: product.packSize },
    { icon: Tag,          label: "NDC Number",        value: product.ndcNumber },
    { icon: Thermometer,  label: "Storage",           value: product.storageConditions },
    { icon: Globe,        label: "Country of Origin", value: product.countryOfOrigin },
    { icon: Package,      label: "Manufacturer",      value: product.manufacturer },
  ].filter((r) => r.value);

  const content = (
    <div className="mx-auto max-w-7xl px-4 py-8">

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="transition-colors hover:text-foreground">Products</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link
              href={`/products?categorySlug=${product.category.slug}`}
              className="transition-colors hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="line-clamp-1 text-foreground">{product.name}</span>
      </nav>

      {/* Research banner */}
      {product.isResearchCompound && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-primary">
            <span className="font-semibold">For Research Use Only.</span> Intended strictly for
            in-vitro laboratory research. Not for human or veterinary use, consumption, or injection.
          </p>
        </div>
      )}

      {/* ── 2-column grid ── */}
      <div className="grid gap-10 lg:grid-cols-2">

        {/* ── Left: image gallery (sticky) ── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border bg-secondary/20">
            <div className="aspect-square">
              {primaryImage ? (
                <ImageZoom src={primaryImage.url} alt={primaryImage.alt} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  {product.isResearchCompound ? (
                    <Microscope className="h-24 w-24 text-muted-foreground/15" strokeWidth={1} />
                  ) : (
                    <FlaskConical className="h-24 w-24 text-muted-foreground/15" strokeWidth={1} />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail strip */}
          {otherImages.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {otherImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt}
                  className="aspect-square w-full cursor-pointer rounded-lg border object-cover opacity-60 transition hover:opacity-100"
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: all info + purchase ── */}
        <div className="flex flex-col">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {product.category && (
              <Link href={`/products?categorySlug=${product.category.slug}`}>
                <Badge variant="secondary" className="capitalize hover:bg-secondary">
                  {product.category.name}
                </Badge>
              </Link>
            )}
            {product.isResearchCompound && (
              <Badge className="bg-accent/10 text-accent hover:bg-accent/20">
                <FlaskConical className="mr-1 h-3 w-3" />
                Research Compound
              </Badge>
            )}
            {product.requiresPrescription && (
              <Badge variant="destructive">Rx Required</Badge>
            )}
            {product.isControlledSubstance && (
              <Badge variant="destructive">Controlled Substance</Badge>
            )}
          </div>

          {/* Name */}
          <h1 className="mt-3 text-2xl font-bold leading-tight text-primary lg:text-3xl">
            {product.name}
          </h1>
          {product.genericName && (
            <p className="mt-1 text-base italic text-muted-foreground">{product.genericName}</p>
          )}
          {product.casNumber && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              CAS: {product.casNumber}
            </p>
          )}

          {/* Short description */}
          {product.shortDescription && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription}
            </p>
          )}

          {/* Peptide quick stats */}
          {product.isResearchCompound && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              {product.purityPercent != null && (
                <div className="rounded-xl border bg-accent/5 p-3 text-center">
                  <p className="text-xl font-bold text-accent">≥{product.purityPercent}%</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Purity (HPLC)</p>
                </div>
              )}
              {product.molecularWeight && (
                <div className="rounded-xl border bg-secondary/30 p-3 text-center">
                  <p className="text-sm font-bold leading-tight text-primary">{product.molecularWeight}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Mol. Weight</p>
                </div>
              )}
              {product.vialSizeMg && (
                <div className="rounded-xl border bg-secondary/30 p-3 text-center">
                  <p className="text-xl font-bold text-primary">{product.vialSizeMg}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Vial Size</p>
                </div>
              )}
            </div>
          )}

          {/* Strength / form / pack chips (non-research) */}
          {!product.isResearchCompound &&
            (product.strength || product.dosageForm || product.packSize) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[product.strength, product.dosageForm, product.packSize]
                  .filter(Boolean)
                  .map((v) => (
                    <span
                      key={v}
                      className="rounded-full border bg-secondary/40 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {v}
                    </span>
                  ))}
              </div>
            )}

          <Separator className="my-5" />

          {/* ── Purchase box ── */}
          <div className="rounded-xl border bg-secondary/20 p-5">
            {/* Availability */}
            <div className="mb-3">
              <AvailabilityBadge productId={product.id} />
            </div>

            {/* Price */}
            {price ? (
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-accent">
                  ${Number(price.amount).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">USD</span>
              </div>
            ) : (
              <p className="mb-4 text-sm text-muted-foreground">
                Price on request — contact us for pricing.
              </p>
            )}

            {/* CTA */}
            {product.requiresPrescription ? (
              <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <p className="font-semibold text-primary">Prescription Required</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Contact{" "}
                    <a href="mailto:support@pharmos.com" className="text-accent hover:underline">
                      support@pharmos.com
                    </a>{" "}
                    to order this item.
                  </p>
                </div>
              </div>
            ) : (
              <AddToCartButton
                showQuantity
                product={{
                  productId: product.id,
                  name: product.name,
                  slug: product.slug,
                  price: price ? Number(price.amount) : 0,
                  image: primaryImage?.url ?? null,
                  strength: product.strength,
                  dosageForm: product.dosageForm,
                  packSize: product.packSize,
                  requiresPrescription: product.requiresPrescription,
                  genericName: product.genericName,
                }}
              />
            )}

            {/* COA */}
            {product.coaUrl && (
              <a
                href={product.coaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-2 text-sm font-medium text-accent hover:underline"
              >
                <Download className="h-4 w-4" />
                Certificate of Analysis (COA)
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Delivery estimate */}
          <div className="mt-4">
            <DeliveryEstimateWidget subtotal={price ? Number(price.amount) : 0} />
          </div>

          {/* Trust strip */}
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Authentic product from a licensed US supplier</span>
          </div>

          {/* ── Spec table ── */}
          {specRows.length > 0 && (
            <div className="mt-6 rounded-xl border">
              <div className="border-b px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Product Specifications
                </span>
              </div>
              <dl className="divide-y text-sm">
                {specRows.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <dt className="flex items-center gap-2 text-muted-foreground sm:w-36 sm:shrink-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-accent/50" />
                      {label}
                    </dt>
                    <dd className="pl-5 font-medium text-foreground sm:pl-0">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail sections (full width below the grid) ── */}
      <Separator className="my-10" />

      <div className="grid gap-6 lg:grid-cols-2">
        {product.description && (
          <section className="rounded-xl border p-5">
            <h2 className="mb-3 font-semibold text-primary">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </section>
        )}

        {product.activeIngredients && product.activeIngredients.length > 0 && (
          <section className="rounded-xl border p-5">
            <h2 className="mb-3 font-semibold text-primary">Active Ingredients</h2>
            <ul className="space-y-1.5">
              {product.activeIngredients.map((ing, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{ing.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {ing.strength}{ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.aminoAcidSequence && (
          <section className="rounded-xl border p-5 lg:col-span-2">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-primary">
              <Microscope className="h-4 w-4 text-accent" />
              Amino Acid Sequence
            </h2>
            <p className="break-all font-mono text-xs leading-loose text-muted-foreground">
              {product.aminoAcidSequence}
            </p>
          </section>
        )}
      </div>

      {/* Research disclaimer */}
      {product.isResearchCompound && (
        <div className="mt-8 rounded-xl border bg-secondary/30 p-5 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Research Use Only Disclaimer</p>
          <p className="mt-1 leading-relaxed">
            This product is sold exclusively for in-vitro research and laboratory purposes. It has not
            been evaluated or approved by the FDA for human or veterinary use. By purchasing this
            product, you represent that you are a qualified researcher and will use it solely for
            lawful research purposes.
          </p>
        </div>
      )}

      {/* Frequently bought together */}
      <FrequentlyBoughtTogether productId={product.id} />

      {/* Related products */}
      {product.category && (
        <RelatedProducts categorySlug={product.category.slug} currentProductId={product.id} />
      )}

      {/* Reviews */}
      <ProductReviews productSlug={product.slug} />

      {/* Sticky mobile Add to Cart */}
      {price && !product.requiresPrescription && (
        <StickyMobileATC
          product={{
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: Number(price.amount),
            image: primaryImage?.url ?? null,
            strength: product.strength,
            dosageForm: product.dosageForm,
            packSize: product.packSize,
            requiresPrescription: product.requiresPrescription,
          }}
          price={Number(price.amount)}
        />
      )}

      {product.category?.slug === "vitamins" && (
        <p className="mt-6 text-xs text-muted-foreground">
          *These statements have not been evaluated by the FDA. This product is not intended to
          diagnose, treat, cure, or prevent any disease.
        </p>
      )}
    </div>
  );

  if (isResearch) {
    return <ResearchDisclaimerGate>{content}</ResearchDisclaimerGate>;
  }

  return content;
}
