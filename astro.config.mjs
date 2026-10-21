// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://goblincodex.fun';

// В output: 'server' интеграция sitemap видит только статические маршруты —
// ни одной статьи/гайда туда не попадало. Плюс разделы /news, /codex,
// /yakkamon на основном домене отдают 302 на поддомены (src/middleware.ts),
// так что в sitemap должны быть именно поддоменные URL. Собираем их сами из
// markdown-файлов коллекций. Хосты держим в синхроне с src/lib/subdomains.ts.
const BLOG = 'https://blog.goblincodex.fun';
const SFL = 'https://sfl.goblincodex.fun';
const YAKK = 'https://yakk.goblincodex.fun';

/** @param {string} file */
function readFrontmatter(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
}

/** @param {string} collection */
function contentEntries(collection) {
  const dir = path.resolve('src/content', collection);
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ id: f.replace(/\.md$/, ''), fm: readFrontmatter(path.join(dir, f)) }))
    .filter(e => !/^draft:\s*true\s*$/m.test(e.fm));
}

// Прошлые главы — /codex/chapter/{slug}; текущая глава редиректит на
// /codex?tab=chapter, её в sitemap не кладём. Даты берём из src/lib/chapters.ts
// регуляркой: конфиг — .mjs и не может импортировать .ts напрямую.
function pastChapterSlugs() {
  const src = fs.readFileSync(path.resolve('src/lib/chapters.ts'), 'utf8');
  const now = Date.now();
  return [...src.matchAll(/slug:\s*'([^']+)'[^}]*endDate:\s*'([^']+)'/g)]
    .filter(([, , end]) => new Date(end).getTime() <= now)
    .map(([, slug]) => slug);
}

function sectionPages() {
  const news = contentEntries('news')
    .map(e => e.fm.match(/^shortId:\s*(\d+)/m)?.[1])
    .filter(Boolean)
    .map(id => `${BLOG}/news/${id}`);
  const guides = contentEntries('guides').map(e => `${SFL}/codex/${e.id}`);
  const yakkamon = contentEntries('yakkamon').map(e => `${YAKK}/yakkamon/${e.id}`);
  const chapters = pastChapterSlugs().map(slug => `${SFL}/codex/chapter/${slug}`);

  return [
    `${BLOG}/news`,
    ...news,
    `${SFL}/codex`,
    `${SFL}/codex/prices`,
    `${SFL}/codex/chapter/past`,
    `${SFL}/codex/chapter/auctions-history`,
    `${SFL}/codex/community/lp-leaderboard`,
    `${SFL}/codex/community/tickets-leaderboard`,
    ...guides,
    ...chapters,
    `${YAKK}/yakkamon`,
    `${YAKK}/yakkamon/kalkulyator-ochkov`,
    ...yakkamon,
  ];
}

// Пути основного домена, которых не должно быть в sitemap: редиректы на
// поддомены (разделы), старые /chapter* (301 на /codex) и служебные страницы.
const EXCLUDED_MAIN_PREFIXES = ['/news', '/codex', '/yakkamon', '/chapter', '/debug/'];
const EXCLUDED_MAIN_PAGES = ['/cookies', '/terms', '/chat-rules'];

export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),

  server: {
    host: '0.0.0.0',
    port: 4321
  },

  integrations: [
    react(),
    sitemap({
      customPages: sectionPages(),
      filter: (page) => {
        const url = new URL(page);
        if (url.origin !== SITE) return true;
        const p = url.pathname.replace(/\/$/, '');
        return !EXCLUDED_MAIN_PREFIXES.some(prefix => p === prefix.replace(/\/$/, '') || p.startsWith(prefix))
          && !EXCLUDED_MAIN_PAGES.includes(p);
      },
      // canonical (src/components/SEO.astro) — без завершающего слэша;
      // sitemap должен совпадать с ним, иначе это два разных URL.
      serialize: (item) => {
        const url = new URL(item.url);
        if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/$/, '');
        return { ...item, url: url.href };
      },
    }),
  ],
});
