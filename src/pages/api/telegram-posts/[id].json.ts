import type { APIRoute } from 'astro';
import { getTelegramPostById } from '../../../lib/db';

export const prerender = false;

// Полный текст Telegram-поста для модалки на /news. Раньше тексты ВСЕХ постов
// ленты вшивались в HTML страницы (~100 постов × текст на каждый просмотр),
// теперь текст подгружается сюда по клику. Текст отдаём как data — клиент
// вставляет через textContent (plain text, без HTML).

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return new Response(JSON.stringify({ error: 'invalid id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const post = await getTelegramPostById(id);
    if (!post) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    return new Response(JSON.stringify({ id: post.id, text: post.text }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[api/telegram-posts/[id]] error:', err);
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
