import type { APIRoute } from 'astro';
import { getCurrentChapter } from '../../lib/chapters';
import { SFL_API_BASE, fetchWithTimeout } from '../../lib/sflApi';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

// Агрегатор для блока «Лидерборд билетов» на вкладке главы: топ-500 билетов
// + пометки, кто уже выиграл предметы на аукционах текущей главы (и за что —
// Flower или гемы), + кто вылетел/просел в топе за сутки. Три запроса к
// sfl-api уходят параллельно; ответ кэшируется на 5 мин (данные снимков
// обновляются раз в ~10 мин, чаще опрашивать бессмысленно).

interface TopEntry {
  rank: number;
  farm_id: number;
  game_username: string | null;
  tickets: number;
}

interface Winner {
  auction_id: string;
  item_name: string;
  farm_id: number;
  username: string | null;
  currency: string; // "flower" | "gems" | название ингредиента | "tickets"
  amount: number;
}

export const GET: APIRoute = async () => {
  const chapter = getCurrentChapter();
  if (!chapter) {
    return cachedJsonResponse({ updated_at: null, leaderboard: [], dropped: [], fallen: [] }, true);
  }
  const start = encodeURIComponent(new Date(chapter.startDate).toISOString());
  const end = encodeURIComponent(new Date(chapter.endDate).toISOString());

  const fetchJson = async (url: string, fallback: unknown) => {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('[api/chapter-leaderboard] fetch error:', url, e);
      return fallback;
    }
  };

  try {
    const [top, winners, changes] = await Promise.all([
      fetchJson(`${SFL_API_BASE}/api/tickets/top500`, { updated_at: null, leaderboard: [] }),
      fetchJson(`${SFL_API_BASE}/api/auctions/winners?start=${start}&end=${end}`, []),
      fetchJson(`${SFL_API_BASE}/api/tickets/top500/changes?hours=24`, { dropped: [], fallen: [] }),
    ]);

    const winsByFarm = new Map<number, { item_name: string; currency: string; amount: number }[]>();
    for (const w of winners as Winner[]) {
      if (w.farm_id == null) continue;
      const list = winsByFarm.get(w.farm_id) ?? [];
      list.push({ item_name: w.item_name, currency: w.currency, amount: w.amount });
      winsByFarm.set(w.farm_id, list);
    }

    const leaderboard = ((top.leaderboard ?? []) as TopEntry[]).map((e) => ({
      rank: e.rank,
      farm_id: e.farm_id,
      username: e.game_username,
      tickets: e.tickets,
      wins: winsByFarm.get(e.farm_id) ?? [],
    }));

    return cachedJsonResponse({
      chapter_name: chapter.name,
      updated_at: top.updated_at ?? null,
      leaderboard,
      dropped: changes.dropped ?? [],
      fallen: changes.fallen ?? [],
    }, false, 300);
  } catch (err) {
    return errorJsonResponse(err, '[api/chapter-leaderboard]');
  }
};
