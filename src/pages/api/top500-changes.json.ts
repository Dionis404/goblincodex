import type { APIRoute } from 'astro';
import { SFL_API_BASE, fetchWithTimeout } from '../../lib/sflApi';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

// Прокси к суточному архиву изменений топ-500 (sfl-api
// /api/tickets/top500/changes/daily*). Без параметра day — список дней
// архива; с day=YYYY-MM-DD — кто выбыл/просел в тот день.
// Кэш: сегодняшний день 5 мин (архив дописывается коллектором раз в час),
// прошедшие дни 1 ч (уже неизменны).
export const GET: APIRoute = async ({ url }) => {
  const day = url.searchParams.get('day') ?? '';
  try {
    if (!day) {
      const res = await fetchWithTimeout(`${SFL_API_BASE}/api/tickets/top500/changes/daily?limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return cachedJsonResponse({ days: await res.json() }, false, 300);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return new Response(JSON.stringify({ error: 'day должен быть YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const res = await fetchWithTimeout(`${SFL_API_BASE}/api/tickets/top500/changes/daily/${day}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const todayUtc = new Date().toISOString().slice(0, 10);
    return cachedJsonResponse(data, false, day === todayUtc ? 300 : 3600);
  } catch (err) {
    return errorJsonResponse(err, '[api/top500-changes]');
  }
};
