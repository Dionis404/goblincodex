/**
 * backfill-telegram-posts.ts
 * One-off import of the @URGSFL channel's message history into the
 * telegram_posts table, by scraping the public t.me/s/ preview page.
 * The goblin-bot service (long-polling, writes to telegram_posts directly)
 * only receives posts published after it starts running — this script
 * backfills everything published before that point. Safe to re-run
 * (ON CONFLICT DO UPDATE).
 *
 * t.me is blocked without a VPN/proxy in some networks (e.g. Russia) — if
 * that's the case, set HTTPS_PROXY (or TELEGRAM_SCRAPE_PROXY) to a proxy URL
 * reachable from this machine and requests will be routed through it.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-telegram-posts.ts
 *   DATABASE_URL="..." HTTPS_PROXY="http://127.0.0.1:10808" npx tsx scripts/backfill-telegram-posts.ts
 */

import pg from 'pg';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const { Pool } = pg;

const proxyUrl = process.env.TELEGRAM_SCRAPE_PROXY ?? process.env.HTTPS_PROXY ?? process.env.https_proxy;
if (proxyUrl) {
  console.log(`Использую прокси для запросов к t.me: ${proxyUrl}`);
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const CHANNEL = 'URGSFL';
const TELETYPE_RE = /blog\.goblincodex\.fun|teletype\.in/;
const MAX_PAGES = 200; // защита от бесконечного цикла

interface ParsedPost {
  id: number;
  date: Date;
  text: string;
  imageUrl: string | null;
  isTeletypeLink: boolean;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

function parseMessages(html: string): ParsedPost[] {
  const blocks = html.split(/(?=<div class="tgme_widget_message[ "])/);
  const posts: ParsedPost[] = [];

  for (const block of blocks) {
    const idMatch = block.match(new RegExp(`data-post="${CHANNEL}/(\\d+)"`));
    if (!idMatch) continue;
    const id = Number(idMatch[1]);

    const dateMatch = block.match(/<time[^>]*datetime="([^"]+)"/);
    if (!dateMatch) continue;
    const date = new Date(dateMatch[1]);

    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const rawText = textMatch
      ? textMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      : '';
    const text = decodeHtmlEntities(rawText).trim();

    const linkPreviewMatch = block.match(/<a class="tgme_widget_message_link_preview[^"]*"\s+href="([^"]+)"/);
    const linkPreviewHref = linkPreviewMatch?.[1] ?? '';

    const photoMatch = block.match(/class="tgme_widget_message_photo_wrap[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/);
    const previewImgMatch = block.match(/class="link_preview_(?:right_image|image)[^"]*"[^>]*style="[^"]*background-image:url\('([^']+)'\)/);
    const imageUrl = photoMatch?.[1] ?? previewImgMatch?.[1] ?? null;

    const isTeletypeLink = TELETYPE_RE.test(text) || TELETYPE_RE.test(linkPreviewHref);

    if (!text) continue; // служебное сообщение без текста — пропускаем

    posts.push({ id, date, text, imageUrl, isTeletypeLink });
  }

  return posts;
}

function parseBeforeCursor(html: string): number | null {
  const match = html.match(/class="tme_messages_more[^"]*"[^>]*data-before="(\d+)"/);
  return match ? Number(match[1]) : null;
}

async function fetchPage(before: number | null): Promise<string> {
  const url = before
    ? `https://t.me/s/${CHANNEL}?before=${before}`
    : `https://t.me/s/${CHANNEL}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`);
  return res.text();
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_posts (
      id           BIGINT PRIMARY KEY,
      message_date TIMESTAMPTZ NOT NULL,
      text         TEXT NOT NULL,
      image_url    TEXT,
      created_at   TIMESTAMPTZ DEFAULT now()
    );
  `);

  let before: number | null = null;
  let totalSaved = 0;
  let totalSkipped = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const html = await fetchPage(before);
    const posts = parseMessages(html);

    if (posts.length === 0) {
      console.log('Пустая страница — история закончилась.');
      break;
    }

    for (const post of posts) {
      if (post.isTeletypeLink) {
        totalSkipped++;
        continue;
      }
      await pool.query(
        `INSERT INTO telegram_posts (id, message_date, text, image_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           message_date = EXCLUDED.message_date,
           text         = EXCLUDED.text,
           image_url    = EXCLUDED.image_url`,
        [post.id, post.date, post.text, post.imageUrl]
      );
      totalSaved++;
    }

    const nextBefore = parseBeforeCursor(html);
    if (nextBefore === null || nextBefore === before) {
      console.log('Достигнут конец истории канала.');
      break;
    }
    before = nextBefore;
    console.log(`Страница ${page + 1}: обработано ${posts.length} постов (before=${before})`);
  }

  console.log(`Готово. Сохранено: ${totalSaved}, пропущено (ссылки на Teletype): ${totalSkipped}`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
