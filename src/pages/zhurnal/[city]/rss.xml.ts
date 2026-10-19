import type { APIRoute } from 'astro';
import { cities, authors, bySlug, edition } from '../../../data/zhurnal';
import { cityArticles, articleUrl, cityUrl } from '../../../data/zhurnal-content';

export function getStaticPaths() {
  return cities.map((city) => ({ params: { city: city.slug }, props: { city } }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async ({ props, site }) => {
  const { city } = props;
  const articles = await cityArticles(city.slug);
  const abs = (p: string) => new URL(p, site).href;
  const items = articles
    .map(
      (a) => `    <item>
      <title>${esc(a.data.title)}</title>
      <link>${abs(articleUrl(a))}</link>
      <guid isPermaLink="true">${abs(articleUrl(a))}</guid>
      <description>${esc(a.data.description)}</description>
      <pubDate>${a.data.date.toUTCString()}</pubDate>
      <category>${esc(a.data.rubric)}</category>
      <dc:creator>${esc(bySlug(authors, a.data.author).name)}</dc:creator>
    </item>`,
    )
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(`${edition.name} ${city.name}`)}</title>
    <link>${abs(cityUrl(city.slug))}</link>
    <atom:link href="${abs(`/zhurnal/${city.slug}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>${esc(city.tagline)}</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
