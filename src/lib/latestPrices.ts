import { fetchLatestPrices, fetchPriceResources } from './sflApi';
import { withTtlCache } from './cache';

// Последняя известная цена предметов по именам (collectibles) — для SSR и
// /api/prices/latest.json. Цена = floor последнего снимка, если его нет —
// latest_sale. Вся карта {item_key → цена} берётся одним запросом
// /sfl/prices/latest и кэшируется в памяти, чтобы страницы не дёргали
// sfl-api на каждый визит.
const CACHE_TTL_MS = 5 * 60 * 1000;

// Предметы, которые sfl-api отслеживает по item_key (в БД есть сделки), но
// не называет: справочник имён ещё не обновлён на новые главы.
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

// Список collectibles (до 20 000 записей) раньше тянулся заново на каждый
// запрос. fetchPriceResources глотает ошибки и возвращает [] — пустой список
// считаем ошибкой, чтобы не закэшировать его на весь TTL. Экспортируется ещё
// и для /api/prices/lookup.json (резолв имён ресурсов в item_key).
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

/**
 * Карта последних цен {item_key → floor ?? latest_sale ?? null} одним
 * запросом. fetchLatestPrices глотает ошибки и возвращает [] — пустую карту
 * считаем ошибкой, чтобы не закэшировать её на весь TTL.
 */
async function latestByKey(): Promise<Map<string, number | null>> {
  const { data } = await withTtlCache('latest-prices:collectibles', CACHE_TTL_MS, async () => {
    const points = await fetchLatestPrices('collectibles');
    if (points.length === 0) throw new Error('empty latest prices');
    return new Map(points.map((p) => [p.item_key, p.floor ?? p.latest_sale ?? null]));
  }, { swr: true });
  return data;
}

/** Цены во Flower по именам; нет цены или предмета — null. */
export async function latestPrices(names: string[]): Promise<Record<string, number | null>> {
  const keyByName = await getKeyByName();
  const byKey = await latestByKey().catch(() => new Map<string, number | null>());
  const entries = [...new Set(names)].map((name) => {
    const key = keyByName.get(name.toLowerCase());
    return [name, key ? (byKey.get(key) ?? null) : null] as const;
  });
  return Object.fromEntries(entries);
}
