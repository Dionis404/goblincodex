// Клиент к sfl-collector-api (микросервис сбора данных SFL, репозиторий Dionis404/sfl-collector).
// Доступен только внутри docker-сети shared-net, поэтому ходить можно только с SSR.
// Здесь только публичные эндпоинты на чтение; админские (/admin/*) сайт не использует.
import { fetchWithTimeout } from './goblinApi';

export const COLLECTOR_BASE: string =
  (import.meta.env.SFL_DATA_API_URL as string | undefined) || 'http://sfl-collector-api:8000';

export interface CollectorResult {
  /** Путь вместе с query — как его видит сервис. */
  path: string;
  /** HTTP-статус; 0 — сервис недоступен (сеть/таймаут). */
  status: number;
  ms: number;
  data: unknown;
  error?: string;
}

/** GET без кэша: страница отладочная, нужны свежие данные и реальное время ответа. */
export async function collectorGet(path: string, timeoutMs = 8000): Promise<CollectorResult> {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(`${COLLECTOR_BASE}${path}`, timeoutMs);
    const text = await res.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* оставляем текст как есть */
    }
    const detail = !res.ok && data && typeof data === 'object' && 'detail' in data ? String((data as { detail: unknown }).detail) : undefined;
    return { path, status: res.status, ms: Date.now() - started, data, error: detail };
  } catch (e) {
    return { path, status: 0, ms: Date.now() - started, data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
