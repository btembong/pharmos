import { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { products, productCategories } from '@pharmaflow/db/schema';
import { eq, isNull } from 'drizzle-orm';

const BASE_URL = 'https://pharmospeptide.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/track`, lastModified: new Date(), changeFrequency: 'never', priority: 0.3 },
  ];

  try {
    const [allProducts, allCategories] = await Promise.all([
      db.select({ slug: products.slug, updatedAt: products.updatedAt })
        .from(products)
        .where(isNull(products.deletedAt)),
      db.select({ slug: productCategories.slug, updatedAt: productCategories.updatedAt })
        .from(productCategories)
        .where(isNull(productCategories.deletedAt)),
    ]);

    const productPages: MetadataRoute.Sitemap = allProducts.map((p) => ({
      url: `${BASE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ?? new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const categoryPages: MetadataRoute.Sitemap = allCategories.map((c) => ({
      url: `${BASE_URL}/products/category/${c.slug}`,
      lastModified: c.updatedAt ?? new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticPages, ...categoryPages, ...productPages];
  } catch {
    return staticPages;
  }
}
