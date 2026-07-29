/**
 * Клиент к внутреннему goblin-api (данные ферм SFL).
 * Единственный реальный роут — GET /api/farms?ids=1,2,3 (батч, query-параметр,
 * список ID через запятую) — нет отдельных /farm/:id или /farm/:id/refresh.
 * goblin-api сам гарантирует строку в БД (farm_cache) и в фоне обновляет её из
 * api.sunflower-land.com — ответ отдаётся сразу с тем, что есть в кэше на
 * данный момент, поэтому первый запрос по новому ID может вернуть null, а
 * повторный запрос через несколько секунд — уже реальные данные ("обновление"
 * это просто повторный вызов /farms, отдельного refresh-эндпоинта нет).
 */

const API_BASE = (import.meta.env.PUBLIC_API_BASE as string | undefined) ?? '/api';

/** Сырой ответ SFL API (api.sunflower-land.com/community/farms/:id) как есть. */
export type FarmData = Record<string, unknown>;

export type FarmResponse = {
  data: FarmData;
  updated_at: string;
};

export class FarmApiError extends Error {}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new FarmApiError(`goblin-api responded with ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchFarms(
  farmIds: Array<number | string>,
  signal?: AbortSignal
): Promise<Record<string, FarmResponse | null>> {
  const ids = farmIds.join(',');
  const res = await fetch(`${API_BASE}/farms?ids=${encodeURIComponent(ids)}`, { signal });
  return parseJsonOrThrow<Record<string, FarmResponse | null>>(res);
}

export async function fetchFarm(farmId: number | string, signal?: AbortSignal): Promise<FarmResponse | null> {
  const res = await fetchFarms([farmId], signal);
  return res[String(farmId)] ?? null;
}
