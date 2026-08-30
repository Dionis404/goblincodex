import { getCollection } from 'astro:content';
import { getTelegramPosts } from './db';

export type NewsGame = 'sunflower' | 'yakkamon' | 'telegram';

export type NewsItem = {
  title: string;
  date: Date;
  dateLabel: string;
  tag: string;
  tagColor: string;
  link: string;
  image: string;
  desc: string;
  source: 'news' | 'telegram' | 'fallback';
  game: NewsGame;
  slug?: string;
  fullText?: string;
};

const TELEGRAM_CHANNEL = 'URGSFL';

const tagColors: Record<string, string> = {
  'Стримы':     'purple',
  'Обновление': 'blue',
  'Гайд':       'green',
  'Гайды':      'green',
  'Экономика':  'amber',
  'Ивент':      'amber',
  'Контент':    'green',
  'Бродкаст':   'purple',
  'Новость':    'green',
  'Телеграм':   'blue',
  'GitHub':     'blue',
  'Другое':     'amber',
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

// Постов без явного #yakkamon/#sunflowerLand-хэштега пока большинство (старые
// посты канала публиковались без хэштегов вообще) — они попадают в отдельный
// верхний тег "Телеграм", а не теряются и не привязываются наугад к игре.
function detectTelegramGame(text: string): NewsGame {
  if (/#yakkamon/i.test(text)) return 'yakkamon';
  if (/#sunflowerland/i.test(text)) return 'sunflower';
  return 'telegram';
}

async function fetchCollectionNews(): Promise<NewsItem[]> {
  try {
    const entries = await getCollection('news', ({ data }) => !data.draft);
    return entries.map(e => {
      const date = new Date(e.data.date);
      return {
        title: e.data.title,
        date,
        dateLabel: formatDate(date),
        tag: e.data.category,
        tagColor: tagColors[e.data.category] ?? 'green',
        link: `/news/${e.id}`,
        slug: e.id,
        image: e.data.image ?? '',
        desc: e.data.description,
        source: 'news' as const,
        game: e.data.game,
      };
    });
  } catch (e) {
    console.error('[news-feed] News collection read error:', e);
    return [];
  }
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
        fullText: post.text,
        source: 'telegram' as const,
        game: detectTelegramGame(post.text),
      };
    });
  } catch (e) {
    console.error('[news-feed] Telegram posts fetch error:', e);
    return [];
  }
}

export async function fetchMergedNews(opts: { telegramLimit: number }): Promise<{
  items: NewsItem[];
  tagsByGame: Record<NewsGame, string[]>;
}> {
  const [collectionNews, telegramNews] = await Promise.all([
    fetchCollectionNews(),
    fetchTelegramNews(opts.telegramLimit),
  ]);

  const items = [...collectionNews, ...telegramNews].sort((a, b) => b.date.getTime() - a.date.getTime());

  const tagsByGame: Record<NewsGame, string[]> = { sunflower: [], yakkamon: [], telegram: [] };
  for (const game of Object.keys(tagsByGame) as NewsGame[]) {
    tagsByGame[game] = [...new Set(items.filter(n => n.game === game).map(n => n.tag).filter(Boolean))];
  }

  return { items, tagsByGame };
}
