// In-process лимит запросов по IP для дорогих /api-роутов (платные
// эмбеддинги/LLM routerai, уведомления админу в Telegram, веер запросов
// к sfl-price-service). Живёт в памяти одного Node-процесса — для
// standalone-адаптера с одним контейнером этого достаточно; при
// горизонтальном масштабировании лимит станет "на инстанс".

interface Rule {
  limit: number;
  windowMs: number;
}

// Ключ — точный pathname роута. Лимиты с запасом для живого человека
// (поиск дебаунсится на клиенте, и на каждый запрос уходит по одному
// вызову search + search-answer), но не дают крутить ключ routerai скриптом.
const RULES: Record<string, Rule> = {
  '/api/search.json':          { limit: 30, windowMs: 60_000 },
  '/api/search-answer.json':   { limit: 15, windowMs: 60_000 },
  '/api/search-feedback.json': { limit: 10, windowMs: 60_000 },
  '/api/prices/latest.json':   { limit: 30, windowMs: 60_000 },
};

// Фиксированное окно: на ключ — счётчик и момент сброса.
const hits = new Map<string, { count: number; resetAt: number }>();

const SWEEP_INTERVAL_MS = 5 * 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) hits.delete(key);
  }
}

/**
 * IP клиента. Контейнер слушает только 127.0.0.1 и стоит за Cloudflare →
 * reverse proxy, поэтому адрес сокета — это прокси, а реальный IP берём из
 * cf-connecting-ip (выставляет Cloudflare) с запасными вариантами.
 */
export function clientIp(request: Request, fallback: string | undefined): string {
  const h = request.headers;
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    fallback ??
    'unknown'
  );
}

/** null — запрос пропускаем; Response 429 — лимит исчерпан. */
export function checkRateLimit(pathname: string, ip: string): Response | null {
  const rule = RULES[pathname];
  if (!rule) return null;

  const now = Date.now();
  sweep(now);

  const key = `${pathname}|${ip}`;
  let entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + rule.windowMs };
    hits.set(key, entry);
  }
  entry.count++;

  if (entry.count <= rule.limit) return null;

  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return new Response(JSON.stringify({ error: 'too many requests' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Retry-After': String(retryAfter),
    },
  });
}
