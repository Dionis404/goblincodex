import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../lib/goblinApi';
import { PRICE_API_BASE, fetchPriceResources } from '../../../lib/priceApi';
import { getBudInstancesByIds, getPetNftInstancesByIds } from '../../../lib/db';
import { isPetTradeable } from '../../../lib/tradeable';
import { cachedJsonResponse, errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

// Минт-NFT (Buds / питомцы), которые видит sfl-price-service. Показываем
// только продавшихся за последние RECENT_HOURS — сетка из всего списка
// (сотни–тысячи) нечитаема. Проверка «продавался ли» дорогая (запрос истории
// на каждый id), поэтому:
//  - результат каждого id кэшируется отдельно (ITEM_TTL_MS) — повторный
//    прогон проверяет только новые/просроченные;
//  - прогон обрывается по DEADLINE_MS и возвращает прогресс (done=false) —
//    клиент доспрашивает каждые пару секунд;
//  - параллельные запросы ждут один и тот же прогон (inflight).
const RECENT_HOURS = 24 * 7;
const ITEM_TTL_MS = 30 * 60 * 1000;
const SCAN_TTL_DONE_MS = 15 * 60 * 1000;
const SCAN_TTL_PARTIAL_MS = 30 * 1000;
const DEADLINE_MS = 20 * 1000;
const CONCURRENCY = 10;
// С запасом под границу обрыва ответов (~19 КБ на проводе).
const MAX_ITEMS = 150;

interface SoldScan { activeIds: number[]; total: number; checked: number; done: boolean }

const soldCache = new Map<number, { at: number; sold: boolean }>();
const scanCache = new Map<string, { at: number; result: SoldScan }>();
const inflight = new Map<string, Promise<SoldScan>>();

/** true/false — проверено и кэшировано; null — price-service недоступен, не кэшируем. */
async function wasSoldRecently(id: number, itemKey: string): Promise<boolean | null> {
  const hit = soldCache.get(id);
  if (hit && Date.now() - hit.at < ITEM_TTL_MS) return hit.sold;

  try {
    const url = new URL(`${PRICE_API_BASE}/prices/${encodeURIComponent(itemKey)}/history`);
    url.searchParams.set('hours', String(RECENT_HOURS));
    url.searchParams.set('limit', '500');
    const res = await fetchWithTimeout(url.toString(), 10000);
    if (res.status === 404) return false; // сервис id не знает — продаж не было
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return null;
    const sold = data.some((p) => p != null && ((p as { floor?: number | null }).floor != null || (p as { latest_sale?: number | null }).latest_sale != null));
    soldCache.set(id, { at: Date.now(), sold });
    return sold;
  } catch {
    return null;
  }
}

async function runSoldScan(category: 'buds' | 'pets', ids: number[]): Promise<SoldScan> {
  const started = Date.now();
  const activeIds: number[] = [];
  let checked = 0;

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    // Дедлайн мягкий: обрываемся между батчами, ушедшие запросы дождёмся.
    if (Date.now() - started > DEADLINE_MS) break;
    const batch = ids.slice(i, i + CONCURRENCY);
    const flags = await Promise.all(batch.map((id) => wasSoldRecently(id, `${category}-${id}`)));
    flags.forEach((f, j) => {
      if (f) activeIds.push(batch[j]);
      if (f != null) checked++;
    });
  }

  return { activeIds, total: ids.length, checked, done: checked >= ids.length };
}

function soldScan(category: 'buds' | 'pets', ids: number[]): Promise<SoldScan> {
  // Ключ скана: категория + размер + контрольная сумма id — при смене набора
  // (новые минты в выдаче price-service) кэш не подсовывает старый список.
  const cacheKey = `${category}:${ids.length}:${ids.reduce((s, i) => s + i, 0) % 1000003}`;
  const cached = scanCache.get(cacheKey);
  if (cached) {
    const ttl = cached.result.done ? SCAN_TTL_DONE_MS : SCAN_TTL_PARTIAL_MS;
    if (Date.now() - cached.at < ttl) return Promise.resolve(cached.result);
  }

  const pending = inflight.get(cacheKey);
  if (pending) return pending;

  const p = runSoldScan(category, ids).then((result) => {
    scanCache.set(cacheKey, { at: Date.now(), result });
    return result;
  });
  inflight.set(cacheKey, p);
  p.catch(() => undefined).finally(() => inflight.delete(cacheKey));
  return p;
}

export const GET: APIRoute = async ({ url }) => {
  const categoryParam = url.searchParams.get('category');
  const category = categoryParam === 'pets' ? 'pets' : 'buds';
  // Тайминги этапов — в лог контейнера; запрос извне периодически висит
  // непойманно долго, без цифр это не диагностируется.
  const t0 = Date.now();
  const timed = (step: string) => console.error(`[api/prices/nft] ${step}: ${Date.now() - t0}ms (category=${category})`);

  try {
    const resources = await fetchPriceResources(category);
    timed('resources');
    const now = Date.now();
    const ids = [
      ...new Set(
        resources
          .map((r) => Number(r.item_key.match(/(\d+)$/)?.[1]))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    // Питомцы по коду игры открываются для торговли по расписанию глав
    // (petRevealConfig) — до даты открытия в список не попадают вообще.
    const eligible = category === 'pets' ? ids.filter((id) => isPetTradeable(id, now)) : ids;

    const scan = await soldScan(category, eligible);
    timed(`scan (checked=${scan.checked}/${scan.total}, done=${scan.done})`);

    const instances = category === 'pets'
      ? await getPetNftInstancesByIds(scan.activeIds)
      : await getBudInstancesByIds(scan.activeIds);
    timed(`db (${instances.length} instances)`);

    // Кап с запасом под границу обрыва ответов (~19 КБ): image_url тянет
    // основной вес, 150 карточек ≈ 18 КБ. item_key не дублируем — клиент
    // собирает его из category + id.
    const items = instances
      .slice(0, MAX_ITEMS)
      .map((i) => {
        const id = category === 'pets' ? (i as { petId: number }).petId : (i as { budId: number }).budId;
        return {
          id,
          image_url: i.imageUrl,
          title: category === 'pets' ? `Pet #${id}` : `Bud #${id}`,
          subtitle: i.type,
        };
      });

    timed('done');
    return cachedJsonResponse(
      { category, items, truncated: instances.length > MAX_ITEMS, total: eligible.length, checked: scan.checked, done: scan.done },
      scan.done,
      scan.done ? 300 : 0,
    );
  } catch (err) {
    return errorJsonResponse(err, '[api/prices/nft]');
  }
};
