// Общий базовый URL и fetch-хелпер с таймаутом для всех SSR-запросов к
// goblin-api. Без таймаута зависший/медленный бэкенд подвешивал бы SSR-рендер
// страницы на неопределённое время — так запрос просто падает по таймауту,
// и вызывающий код уходит в свою обычную catch-деградацию (пустой список/null).
import { withTtlCache } from './cache';

export const GOBLIN_API_BASE = 'http://goblin-api:8000';

export function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

const GOBLIN_JSON_TTL_MS = 5 * 60 * 1000;

/**
 * GET {GOBLIN_API_BASE}{path} → JSON с общим 5-минутным кэшем на процесс.
 * Одни и те же данные (фермеры сообщества, лидерборды) нужны нескольким
 * страницам и API-роутам — кэш общий, чтобы каждый просмотр профиля или
 * кодекса не тянул заново весь список фермеров. Бросает при ошибке/не-2xx
 * (ошибка кэшируется на 30 с, см. withTtlCache). path — только константы
 * из кода: пользовательский ввод в ключ кэша не передавать.
 */
export async function fetchGoblinJsonCached<T = any>(path: string): Promise<T> {
  const { data } = await withTtlCache(`goblin-api:${path}`, GOBLIN_JSON_TTL_MS, async () => {
    const res = await fetchWithTimeout(`${GOBLIN_API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  });
  return data;
}
