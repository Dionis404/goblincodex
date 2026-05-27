import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    category:    z.string(),
    readTime:    z.number(),
    icon:        z.string().default('📄'),
    publishDate: z.string(),
    updatedDate: z.string().optional(),
    draft:       z.boolean().default(false),
    section: z.enum(['guides', 'mechanics', 'nft']).default('guides'),
  }),
});

export const collections = { guides };