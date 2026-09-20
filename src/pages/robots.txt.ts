import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  // site は astro.config.mjs の値。ドメインを変えたときに
  // ここが取り残されないよう、直書きせず導出する。
  const sitemapURL = new URL('sitemap-index.xml', site);
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
