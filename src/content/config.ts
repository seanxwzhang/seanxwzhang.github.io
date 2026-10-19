import { defineCollection, z } from 'astro:content';

const CATEGORY = z.enum(['deep-learning', 'engineering', 'market', 'rambling']);

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // one category or a list, e.g. `category: market` or `category: [market, rambling]`; always an array after parsing
    category: z
      .union([CATEGORY, z.array(CATEGORY).min(1)])
      .transform((c) => (Array.isArray(c) ? c : [c])),
    draft: z.boolean().default(false),
    slug: z.string().optional(),
  }),
});

export const collections = {
  posts,
};
