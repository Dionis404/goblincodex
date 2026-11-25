import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// CMS (Sveltia) пишет даты во frontmatter без кавычек — YAML парсит их
// в Date, а схемы ждут строку "YYYY-MM-DD". Принимаем оба варианта.
const asDateString = (v: unknown) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v;
const dateStr = () => z.preprocess(asDateString, z.string());
const dateStrOpt = () => z.preprocess(asDateString, z.string().optional());

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    category:    z.string().default('Общее'),
    readTime:    z.number().default(5),
    icon:        z.string().default('📄'),
    publishDate: dateStrOpt(),
    updatedDate: dateStrOpt(),
    draft:       z.boolean().default(false),
    section: z.enum(['guides', 'nft']).default('guides'),
    author: z.string().optional(),
    contributors: z.array(z.string()).optional(),
    chapter: z.number().optional(),
  }),
});

const yakkamon = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/yakkamon' }),
  schema: z.object({
    title:       z.string(),
    description: z.string(),
    category:    z.string().default('Основы'),
    readTime:    z.number().default(5),
    icon:        z.string().default('📄'),
    publishDate: dateStrOpt(),
    updatedDate: dateStrOpt(),
    draft:       z.boolean().default(false),
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

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title:       z.string(),
    // Короткий числовой id для /news/{shortId} — независим от slug/имени
    // файла, присваивается один раз по порядку даты публикации (см.
    // scripts/assign-news-short-ids.ts) и никогда не переиспользуется.
    // Для новой статьи: следующий номер после текущего максимума shortId
    // среди всех .md в src/content/news/.
    shortId:     z.number().int().positive(),
    slug:        z.string(),
    date:        dateStr(),
    category:    z.string().default('Новость'),
    // Только 'sunflower'/'yakkamon' — 'telegram' в NewsGame (src/lib/news-feed.ts)
    // существует лишь для Telegram-постов из БД, статья коллекции не может
    // быть "Телеграм"-игрой по смыслу.
    game:        z.enum(['sunflower', 'yakkamon']).default('sunflower'),
    description: z.string(),
    originalUrl: z.string().optional(),
    image:       z.string().optional(),
    draft:       z.boolean().default(false),
  }),
});

export const collections = { guides, mechanics, news, yakkamon };
