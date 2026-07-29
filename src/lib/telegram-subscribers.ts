import { getTelegramSubscriberCount as getTelegramSubscriberCountFromDb } from './db';

const TELEGRAM_CHANNEL = 'URGSFL';
const SUCCESS_TTL_MS = 10 * 60 * 1000; // 10 мин
const FAILURE_TTL_MS = 60 * 1000; // 1 мин — не долбить БД при её недоступности

// In-process cache: survives between requests in the standalone Node adapter
// (как в api/nft-catalog.json.ts).
let cache: { count: number | null; ts: number } | null = null;

export async function getTelegramSubscriberCount(): Promise<number | null> {
  if (cache) {
    const ttl = cache.count !== null ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
    if (Date.now() - cache.ts < ttl) return cache.count;
  }

  try {
    const count = await getTelegramSubscriberCountFromDb(TELEGRAM_CHANNEL);
    cache = { count, ts: Date.now() };
    return count;
  } catch (e) {
    console.error('[telegram-subscribers] db read error:', e);
  }

  cache = { count: null, ts: Date.now() };
  return null;
}
