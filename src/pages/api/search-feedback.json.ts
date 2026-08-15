import type { APIRoute } from 'astro';
import { recordSearchFeedback } from '../../lib/db';
import { notifyAdminTelegram } from '../../lib/telegram-notify';

export const prerender = false;

interface FeedbackBody {
  query?: string;
  collection?: string;
  entryId?: string;
  title?: string;
  rating?: number;
}

export const POST: APIRoute = async ({ request }) => {
  let body: FeedbackBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const { query, collection, entryId, title, rating } = body;
  if (!query || !collection || !entryId || (rating !== 1 && rating !== -1)) {
    return new Response(
      JSON.stringify({ error: 'query, collection, entryId and rating (1 | -1) are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }

  try {
    await recordSearchFeedback(query, collection, entryId, rating);

    if (rating === -1) {
      // Не блокируем ответ клиенту ожиданием доставки в Telegram.
      void notifyAdminTelegram(
        `⚠️ <b>Негативная оценка поиска</b>\n\n` +
          `Запрос: <i>${escapeHtml(query)}</i>\n` +
          `Статья: ${escapeHtml(title ?? entryId)} (${collection})`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[api/search-feedback] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
