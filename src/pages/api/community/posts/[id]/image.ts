import type { APIRoute } from 'astro';

export const prerender = false;

// Прокси картинок Telegram-постов сообщества: goblin-bot пишет в БД
// telegram_posts.image_url уже готовым сайтовым путём вида
// /api/community/posts/12345/image (раньше это был абсолютный URL на
// api.telegram.org, вставлялся в <img src> как есть). Этот роут — тот
// самый путь, буквально совпадает с post.image_url, так что фронтенду
// (src/lib/news-feed.ts) не нужно ничего парсить/переписывать — он просто
// использует значение из БД как относительный src. Здесь на сервере
// проксируем запрос на internal goblin-api (тот же паттерн, что и
// src/pages/api/tickets-leaderboard.json.ts), только отдаём бинарные
// данные картинки, а не JSON.
const GOBLIN_API_BASE = 'http://goblin-api:8000';

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;

  if (!id || !/^\d+$/.test(id)) {
    return new Response('invalid id', { status: 400 });
  }

  try {
    const upstream = await fetch(`${GOBLIN_API_BASE}/api/community/posts/${id}/image`);
    if (!upstream.ok || !upstream.body) {
      return new Response('not found', { status: upstream.status || 502 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    console.error('[api/community/posts/[id]/image] proxy error:', e);
    return new Response('upstream error', { status: 502 });
  }
};
