import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Материалы журнала «Окрестности»: markdown-файлы, по одному на статью.
const zhurnal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/zhurnal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    city: z.enum(['srednegorsk', 'olkhovsk']),
    rubric: z.enum(['mesta', 'eda', 'marshruty', 'sobytiya', 'lyudi']),
    author: z.enum(['marina-sokolova', 'ilya-vetrov', 'dasha-orlova', 'pavel-lipin']),
    date: z.coerce.date(),
    cover: z.string(),
    coverAlt: z.string(),
    kind: z.enum(['article', 'special']).default('article'),
    partner: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = { zhurnal };
