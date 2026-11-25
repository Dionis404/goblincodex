import type { APIRoute } from 'astro';
import { fetchPastAuctions } from '../../../lib/auctionsApi';
import { cachedJsonResponse, errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

// История завершённых аукционов для вкладки «История» центра аукционов на
// странице главы. Те же данные, что SSR отдаёт странице
// /codex/chapter/auctions-history, но клиент тянет их только когда вкладка
// реально открыта — в HTML каждого просмотра /codex они не едут.
// Внимание: sfl-api отдаёт максимум 100 последних аукционов (см. fetchPastAuctions).
export const GET: APIRoute = async () => {
  try {
    const auctions = await fetchPastAuctions(5000);
    return cachedJsonResponse({ chapterName: 'прошлых глав', auctions }, false, 600);
  } catch (err) {
    return errorJsonResponse(err, '[api/auctions/history]');
  }
};
