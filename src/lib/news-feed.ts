import { getTelegramPosts } from './db';

export type NewsItem = {
  title: string;
  date: Date;
  dateLabel: string;
  tag: string;
  tagColor: string;
  link: string;
  image: string;
  desc: string;
  source: 'rss' | 'telegram';
};

const BLOG_RSS = 'https://blog.goblincodex.fun/data/rss';
const MAX_RSS_PAGES = 50;
const TELEGRAM_CHANNEL = 'URGSFL';

const tagColors: Record<string, string> = {
  'Стримы':     'purple',
  'Обновление': 'blue',
  'Гайд':       'green',
  'Экономика':  'amber',
  'Ивент':      'amber',
  'Контент':    'green',
  'Бродкаст':   'purple',
  'Новость':    'green',
  'Телеграм':   'blue',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/<[^>]+>/g, '').trim();
  return clean.length > max ? clean.slice(0, max) + '...' : clean;
}

// Telegram-домены (t.me, telesco.pe) заблокированы у части посетителей без VPN —
// отдаём картинку через публичный image-proxy, чтобы браузер шёл не на них.
function proxyTelegramImage(url: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
}

function parseRssItems(xml: string): NewsItem[] {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return items.map(item => {
    const title    = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? '';
    const link     = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '#';
    const pubDate  = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? '';
    const category = item.match(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/)?.[1]?.trim() ?? 'Новость';
    const image    = item.match(/media:content[^>]*url="([^"]+)"/)?.[1] ?? '';
    const descRaw  = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() ?? '';
    const desc     = truncate(descRaw, 120);
    const date     = pubDate ? new Date(pubDate) : new Date(0);

    return {
      title, date, dateLabel: formatDate(date),
      tag: category, tagColor: tagColors[category] ?? 'green',
      link, image, desc, source: 'rss' as const,
    };
  });
}

function parseNextRssUrl(xml: string): string | null {
  const match = xml.match(/<atom:link[^>]*rel=["']next["'][^>]*href=["']([^"']+)["']/i)
             ?? xml.match(/<atom:link[^>]*href=["']([^"']+)["'][^>]*rel=["']next["']/i);
  return match?.[1] ?? null;
}

async function fetchRssNews(): Promise<NewsItem[]> {
  const news: NewsItem[] = [];
  try {
    let nextUrl: string | null = BLOG_RSS;
    for (let page = 0; page < MAX_RSS_PAGES && nextUrl; page++) {
      const res = await fetch(nextUrl);
      const xml = await res.text();
      news.push(...parseRssItems(xml));
      nextUrl = parseNextRssUrl(xml);
    }
  } catch (e) {
    console.error('[news-feed] RSS fetch error:', e);
  }
  return news;
}

async function fetchTelegramNews(limit: number): Promise<NewsItem[]> {
  try {
    const posts = await getTelegramPosts(limit);
    return posts.map(post => {
      const title = post.text.split('\n')[0].trim();
      return {
        title,
        date: post.date,
        dateLabel: formatDate(post.date),
        tag: 'Телеграм',
        tagColor: tagColors['Телеграм'],
        link: `https://t.me/${TELEGRAM_CHANNEL}/${post.id}`,
        image: post.imageUrl ? proxyTelegramImage(post.imageUrl) : '',
        desc: truncate(post.text, 120),
        source: 'telegram' as const,
      };
    });
  } catch (e) {
    console.error('[news-feed] Telegram posts fetch error:', e);
    return [];
  }
}

export async function fetchMergedNews(opts: { telegramLimit: number }): Promise<{ items: NewsItem[]; tags: string[] }> {
  const [rssNews, telegramNews] = await Promise.all([
    fetchRssNews(),
    fetchTelegramNews(opts.telegramLimit),
  ]);

  const items = [...rssNews, ...telegramNews].sort((a, b) => b.date.getTime() - a.date.getTime());
  const tags = [...new Set(items.map(n => n.tag).filter(Boolean))];

  return { items, tags };
}
