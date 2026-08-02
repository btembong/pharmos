import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/account/', '/checkout/', '/cart/'],
      },
    ],
    sitemap: 'https://pharmospeptide.com/sitemap.xml',
  };
}
