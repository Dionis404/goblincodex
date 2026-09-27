/**
 * SSR-клиент к sfl-price-service (контейнер sfl-price-service-api-1) — история
 * цен ресурсов/предметов Sunflower Land. Порт наружу не проброшен, доступен
 * только другим контейнерам в shared-net (см. project docs, "sfl-price-service:
 * архитектура"). Как и goblinApi.ts — только server-to-server, из браузера
 * этот адрес недостижим.
 */
import { fetchWithTimeout } from './goblinApi';

export const PRICE_API_BASE = 'http://sfl-price-service-api-1:8000';

export type PriceCategory = 'collectibles' | 'wearables' | 'buds' | 'pets' | 'economies';

export interface PriceResource {
  item_key: string;
  item_name: string;
}

export interface PricePoint {
  item_key: string;
  item_name: string;
  captured_at: string; // ISO, с таймзоной
  snapshot_date: string; // YYYY-MM-DD
  floor: number | null;
  low: number | null;
  high: number | null;
  latest_sale: number | null;
  best_offer: number | null;
  volume: number | null;
  trades: number | null;
  quantity: number | null;
  listing_count: number | null;
  offer_count: number | null;
  flower_price: number | null;
  floor_usd: number | null;
  latest_sale_usd: number | null;
}

/** Список отслеживаемых предметов — по умолчанию только collectibles (у них есть человекочитаемые имена). */
export async function fetchPriceResources(category: PriceCategory = 'collectibles'): Promise<PriceResource[]> {
  try {
    const url = new URL(`${PRICE_API_BASE}/resources`);
    url.searchParams.set('category', category);
    url.searchParams.set('limit', '20000');
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return data;
  } catch (e) {
    console.error('[priceApi] fetchPriceResources error:', e);
    return [];
  }
}

/**
 * История цены одного предмета за последние hours часов (макс 2160 = 90 дней),
 * отсортирована по возрастанию времени для удобства построения графика.
 */
export async function fetchPriceHistory(itemKey: string, hours = 24 * 30, limit = 2000): Promise<PricePoint[]> {
  try {
    const url = new URL(`${PRICE_API_BASE}/prices/${encodeURIComponent(itemKey)}/history`);
    url.searchParams.set('hours', String(hours));
    url.searchParams.set('limit', String(limit));
    const res = await fetchWithTimeout(url.toString(), 10000);
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: PricePoint[] = await res.json();
    if (!Array.isArray(data)) throw new Error('unexpected response shape');
    return [...data].sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime());
  } catch (e) {
    console.error('[priceApi] fetchPriceHistory error:', e);
    return [];
  }
}
