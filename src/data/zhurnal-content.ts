// Выборки материалов журнала: по городу, рубрике, автору; адреса страниц.
import { getCollection, type CollectionEntry } from 'astro:content';

export type Article = CollectionEntry<'zhurnal'>;

export const base = '/zhurnal';

export const cityUrl = (city: string) => `${base}/${city}/`;
export const rubricUrl = (city: string, rubric: string, page = 1) =>
  `${base}/${city}/${rubric}/${page > 1 ? `${page}/` : ''}`;
export const articleUrl = (a: Article) => `${base}/${a.data.city}/${a.data.rubric}/${a.id}/`;
export const authorUrl = (city: string, author: string) => `${base}/${city}/avtor/${author}/`;
export const searchUrl = (city: string) => `${base}/${city}/poisk/`;
export const rssUrl = (city: string) => `${base}/${city}/rss.xml`;

const byDateDesc = (a: Article, b: Article) => b.data.date.getTime() - a.data.date.getTime();

export async function cityArticles(city: string) {
  const all = await getCollection('zhurnal', (e) => e.data.city === city);
  return all.sort(byDateDesc);
}

export async function allArticles() {
  return (await getCollection('zhurnal')).sort(byDateDesc);
}
