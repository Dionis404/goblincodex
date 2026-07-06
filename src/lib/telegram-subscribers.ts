const TELEGRAM_CHANNEL = '@URGSFL';
const SUCCESS_TTL_MS = 10 * 60 * 1000; // 10 мин
const FAILURE_TTL_MS = 60 * 1000; // 1 мин — не долбить недоступный API на каждый запрос

// In-process cache: survives between requests in the standalone Node adapter
// (как в api/nft-catalog.json.ts). api.telegram.org иногда медленно отвечает
// или недоступен с прод-сервера — без кэша (в т.ч. кэша неудач) это добавляло
// секунды блокирующего ожидания к каждому SSR-рендеру главной.
let cache: { count: number | null; ts: number } | null = null;

export async function getTelegramSubscriberCount(): Promise<number | null> {
  if (cache) {
    const ttl = cache.count !== null ? SUCCESS_TTL_MS : FAILURE_TTL_MS;
    if (Date.now() - cache.ts < ttl) return cache.count;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${encodeURIComponent(TELEGRAM_CHANNEL)}`,
      { signal: AbortSignal.timeout(2000) }
    );
    const data = await res.json();
    if (data.ok) {
      cache = { count: data.result, ts: Date.now() };
      return cache.count;
    }
    console.error('[telegram-subscribers] getChatMemberCount error:', data.description);
  } catch (e) {
    console.error('[telegram-subscribers] fetch error:', e);
  }

  cache = { count: null, ts: Date.now() };
  return null;
}
