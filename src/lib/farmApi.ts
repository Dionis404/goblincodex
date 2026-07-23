/**
 * Клиент к внутреннему goblin-api (данные ферм SFL).
 * Все запросы идут через свой домен (nginx проксирует /api/farm/* на goblin-api),
 * никогда напрямую в api.sunflower-land.com — внешний SFL API может быть медленным
 * или недоступным, а goblin-api сам кеширует/обновляет данные в БД.
 */

const API_BASE = (import.meta.env.PUBLIC_API_BASE as string | undefined) ?? '/api';

export type FarmData = Record<string, unknown>;

export type FarmResponse = {
  farm_id: number;
  data: FarmData;
  updated_at: string;
};

export class FarmApiError extends Error {}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw new FarmApiError(`goblin-api responded with ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchFarm(farmId: number | string, signal?: AbortSignal): Promise<FarmResponse> {
  const res = await fetch(`${API_BASE}/farm/${farmId}`, { signal });
  return parseJsonOrThrow<FarmResponse>(res);
}

export async function fetchFarms(
  farmIds: Array<number | string>,
  signal?: AbortSignal
): Promise<Record<string, FarmResponse | null>> {
  const ids = farmIds.join(',');
  const res = await fetch(`${API_BASE}/farms?ids=${encodeURIComponent(ids)}`, { signal });
  return parseJsonOrThrow<Record<string, FarmResponse | null>>(res);
}

export async function refreshFarm(farmId: number | string, signal?: AbortSignal): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/farm/${farmId}/refresh`, { method: 'POST', signal });
  return parseJsonOrThrow<{ status: string }>(res);
}
