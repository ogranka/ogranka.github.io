import type { APIRoute } from 'astro';
import { cases } from '../data/cases';

// Карта сайта хаба: главная и страницы кейсов. Демо-магазин, демо-форум и
// демо-журнал закрыты от индексации и сюда не попадают; у журнала своя карта
// как часть кейса, на неё robots.txt не ссылается.
export const GET: APIRoute = ({ site }) => {
  const pages = ['/', ...cases.map((c) => c.href)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${new URL(p, site).href}</loc><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
