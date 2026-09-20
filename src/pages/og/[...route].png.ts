import type { APIRoute } from 'astro';
import { listOgPages, type OgPage } from '../../lib/og/pages';
import { renderOgImage } from '../../lib/og/render';

export async function getStaticPaths() {
  const pages = await listOgPages();
  return pages.map((page) => ({
    params: { route: page.route },
    props: { eyebrow: page.eyebrow, headline: page.headline, subline: page.subline },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { eyebrow, headline, subline } = props as Pick<OgPage, 'eyebrow' | 'headline' | 'subline'>;
  const png = await renderOgImage({ eyebrow, headline, subline });

  return new Response(png, {
    headers: { 'Content-Type': 'image/png' },
  });
};
