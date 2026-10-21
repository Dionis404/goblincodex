import type { APIRoute } from 'astro';
import { recordSearchFeedback, type SearchResult } from '../../lib/db';
import { errorJsonResponse } from '../../lib/cache';
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

  const { query, collection, entryId, title, rating } = (body && typeof body === 'object' ? body : {}) as FeedbackBody;
  if (
    !isShortString(query) || !isShortString(entryId) ||
    (title !== undefined && !isShortString(title)) ||
    !isValidCollection(collection) ||
    (rating !== 1 && rating !== -1)
  ) {
    return new Response(
      JSON.stringify({ error: `query, collection, entryId and rating (1 | -1) are required; strings up to ${MAX_FIELD_LENGTH} chars` }),
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
          `Статья: ${escapeHtml(title ?? entryId)} (${escapeHtml(collection)})`,
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return errorJsonResponse(err, '[api/search-feedback]');
  }
};

// Поля приходят от анонимного клиента, уходят в БД и в Telegram админу
// (лимит сообщения 4096 символов) — режем длину и проверяем коллекцию.
const MAX_FIELD_LENGTH = 200;
const VALID_COLLECTIONS: SearchResult['collection'][] = ['guides', 'mechanics', 'reference', 'news', 'yakkamon'];

function isValidCollection(v: unknown): v is SearchResult['collection'] {
  return VALID_COLLECTIONS.includes(v as SearchResult['collection']);
}

function isShortString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_FIELD_LENGTH;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
