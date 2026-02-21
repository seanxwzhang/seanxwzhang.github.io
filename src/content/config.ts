import { defineCollection, z } from 'astro:content';

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.enum(['deep-learning', 'engineering', 'market', 'rambling']),
    draft: z.boolean().default(false),
    slug: z.string().optional(),
  }),
});

export const collections = {
  posts,
};
