import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    category:    z.string().default('Общее'),
    readTime:    z.number().default(5),
    icon:        z.string().default('📄'),
    publishDate: z.string().optional(),
    updatedDate: z.string().optional(),
    draft:       z.boolean().default(false),
    section: z.enum(['guides', 'nft']).default('guides'),
    author: z.string().optional(),
    contributors: z.array(z.string()).optional(),
    chapter: z.number().optional(),
  }),
});

const mechanics = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/mechanics' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    icon:        z.string().default('⚙️'),
    order:       z.number().default(99),
    draft:       z.boolean().default(false),
  }),
});

export const collections = { guides, mechanics };
