import { fetchPriceResources, fetchPriceHistory } from './priceApi';
import { withTtlCache } from './cache';

// Последняя известная цена предметов по именам (collectibles) — для SSR и
// /api/prices/latest.json. Цена = floor последней точки, если его нет —
// latest_sale. Кэш в памяти, чтобы страницы не дёргали sfl-price-service на
// каждый визит.
const CACHE_TTL_MS = 5 * 60 * 1000;
// Не больше стольких одновременных запросов истории к sfl-price-service.
const CONCURRENCY = 10;
const cache = new Map<string, { at: number; price: number | null }>();

async function priceForName(name: string, keyByName: Map<string, string>): Promise<number | null> {
  // Кэшируем по item_key, а не по присланному имени: неизвестные имена
  // (любой мусор из query string) в кэш не попадают и в sfl-price-service
  // не уходят, так что размер кэша ограничен числом реальных предметов.
  const key = keyByName.get(name.toLowerCase());
  if (!key) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.price;

  let price: number | null = null;
  const points = await fetchPriceHistory(key, 24 * 7, 200);
  for (let i = points.length - 1; i >= 0 && price == null; i--) {
    price = points[i].floor ?? points[i].latest_sale ?? null;
  }
  cache.set(key, { at: Date.now(), price });
  return price;
}

// Список collectibles (до 20 000 записей) раньше тянулся заново на каждый
// запрос. fetchPriceResources глотает ошибки и возвращает [] — пустой список
// считаем ошибкой, чтобы не закэшировать его на весь TTL. Экспортируется ещё
// и для /api/prices/lookup.json (резолв имён ресурсов в item_key).
// Предметы, которые sfl-price-service отслеживает по item_key (в БД есть
// сделки), но не называет: его справочник имён ещё не обновлён на Главу 16.
// id — KNOWN_ITEMS из кода игры (types/index.ts). Список сервиса имеет
// приоритет: как только имя там появится, оно победит оверрайд.
const ITEM_KEY_OVERRIDES: Record<string, string> = {
  'green beetle': 'collectibles-3084',
  'blue beetle': 'collectibles-3085',
  'pink beetle': 'collectibles-3086',
  'amber beetle': 'collectibles-3087',
  'pig bristles': 'collectibles-3089',
  truffle: 'collectibles-3090',
  'crystal leaf': 'collectibles-3091',
  'truffle seasoning': 'collectibles-3101',
};

export async function getKeyByName(): Promise<Map<string, string>> {
  try {
    const { data } = await withTtlCache('price-resources:collectibles', CACHE_TTL_MS, async () => {
      const resources = await fetchPriceResources('collectibles');
      if (resources.length === 0) throw new Error('empty collectibles list');
      return new Map(resources.map((r) => [r.item_name.toLowerCase(), r.item_key]));
    }, { swr: true });
    const merged = new Map(data);
    for (const [name, key] of Object.entries(ITEM_KEY_OVERRIDES)) {
      if (!merged.has(name)) merged.set(name, key);
    }
    return merged;
  } catch {
    return new Map(Object.entries(ITEM_KEY_OVERRIDES));
  }
}

/** Цены во Flower по именам; нет цены или предмета — null. */
export async function latestPrices(names: string[]): Promise<Record<string, number | null>> {
  const keyByName = await getKeyByName();
  const unique = [...new Set(names)];
  const entries: (readonly [string, number | null])[] = [];
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    entries.push(...(await Promise.all(batch.map(async (n) => [n, await priceForName(n, keyByName)] as const))));
  }
  return Object.fromEntries(entries);
}
