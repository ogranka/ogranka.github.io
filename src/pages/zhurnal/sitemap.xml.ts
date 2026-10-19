import type { APIRoute } from 'astro';
import { cities, rubrics, authors } from '../../data/zhurnal';
import { allArticles, articleUrl, authorUrl, cityUrl, rubricUrl, searchUrl } from '../../data/zhurnal-content';

export const GET: APIRoute = async ({ site }) => {
  const articles = await allArticles();
  const abs = (p: string) => new URL(p, site).href;
  const urls: { loc: string; lastmod?: string; priority: string }[] = [];
  for (const city of cities) {
    const mine = articles.filter((a) => a.data.city === city.slug);
    urls.push({ loc: abs(cityUrl(city.slug)), lastmod: mine[0]?.data.date.toISOString().slice(0, 10), priority: '1.0' });
    urls.push({ loc: abs(rubricUrl(city.slug, 'lenta')), priority: '0.7' });
    for (const r of rubrics) urls.push({ loc: abs(rubricUrl(city.slug, r.slug)), priority: '0.7' });
    for (const a of mine) urls.push({ loc: abs(articleUrl(a)), lastmod: a.data.date.toISOString().slice(0, 10), priority: '0.8' });
    for (const au of authors) urls.push({ loc: abs(authorUrl(city.slug, au.slug)), priority: '0.4' });
    urls.push({ loc: abs(searchUrl(city.slug)), priority: '0.2' });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
