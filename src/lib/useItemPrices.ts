import { useEffect, useState } from 'react';

/**
 * Последние floor-цены предметов по именам (collectibles) через
 * /api/prices/latest.json. Запрос кэшируется на уровне модуля по набору имён —
 * несколько таблиц на одной странице не дёргают API повторно. Пока грузится —
 * null; при ошибке — {} (все цены отсутствуют).
 */
const requests = new Map<string, Promise<Record<string, number | null>>>();

function loadPrices(names: string[]): Promise<Record<string, number | null>> {
  const key = [...names].sort().join(',');
  let req = requests.get(key);
  if (!req) {
    req = fetch(`/api/prices/latest.json?names=${encodeURIComponent(key)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => (data.prices ?? {}) as Record<string, number | null>)
      .catch(() => {
        requests.delete(key); // не кэшируем ошибку — следующая загрузка попробует снова
        return {};
      });
    requests.set(key, req);
  }
  return req;
}

export function useItemPrices(names: string[]): Record<string, number | null> | null {
  const [prices, setPrices] = useState<Record<string, number | null> | null>(null);
  const key = [...names].sort().join(',');
  useEffect(() => {
    let cancelled = false;
    loadPrices(key ? key.split(',') : []).then((p) => { if (!cancelled) setPrices(p); });
    return () => { cancelled = true; };
  }, [key]);
  return prices;
}
