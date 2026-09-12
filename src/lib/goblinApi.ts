// Общий базовый URL и fetch-хелпер с таймаутом для всех SSR-запросов к
// goblin-api. Без таймаута зависший/медленный бэкенд подвешивал бы SSR-рендер
// страницы на неопределённое время — так запрос просто падает по таймауту,
// и вызывающий код уходит в свою обычную catch-деградацию (пустой список/null).
export const GOBLIN_API_BASE = 'http://goblin-api:8000';

export function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}
