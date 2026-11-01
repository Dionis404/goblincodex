import type { APIRoute } from 'astro';
import { fetchPriceHistory } from '../../../../lib/priceApi';
import { withTtlCache } from '../../../../lib/cache';

export const prerender = false;

// Сколько точек максимум отдаём на график. Полный ответ истории (~130 КБ
// за сутки по ходовому ресурсу) обрывается где-то на пути к клиенту
// (диагностика: ~15–19 КБ по проводу, дальше стоп) — поэтому прореживаем
// и отдаём только поля, нужные графику. 200 × ~60 Б ≈ 12–15 КБ.
const MAX_POINTS = 200;

interface SlimPoint { t: string; f: number | null; s: number | null }

interface ChartData {
  points: SlimPoint[];
  summary: {
    first: number | null;
    last: number | null;
    min: number | null;
    max: number | null;
    change: number | null;
    changePct: number | null;
  } | null;
  /** Сколько точек было до прореживания — диагностика полноты истории. */
  totalPoints: number;
}

/** Равномерное прореживание; первая и последняя точки сохраняются всегда. */
function samplePoints<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  // На всякий случай убираем дубликаты, если round() сошёлся на одной точке.
  return [...new Map(out.map((p) => [JSON.stringify(p), p])).values()];
}

export const GET: APIRoute = async ({ params, url }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const itemKey = params.itemKey!;
  const hoursParam = url.searchParams.get('hours');
  // Клампим на диапазон, который реально понимает sfl-price-service (макс 90 дней).
  const hours = Math.min(Math.max(Number(hoursParam) || 24 * 30, 1), 2160);
  // Максимум, который принимает sfl-price-service (21000 уже отклоняет).
  // При 5-минутных снапшотах 90 дней ≈ 10–26 тыс. точек — 20000 покрывает
  // полный период (проверено на проде: hours=2160 отдаёт все 10009 точек
  // с краями 27.09–01.11).
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitParam) || 20000, 1), 20000);

  try {
    const { data } = await withTtlCache(`price-chart:${itemKey}:${hours}:${limit}`, 5 * 60 * 1000, async (): Promise<ChartData> => {
      const points = await fetchPriceHistory(itemKey, hours, limit);
      const values = points
        .map((p) => p.floor ?? p.latest_sale)
        .filter((v): v is number => v != null);

      const summary = values.length
        ? {
            first: values[0],
            last: values[values.length - 1],
            min: Math.min(...values),
            max: Math.max(...values),
            change: values[values.length - 1] - values[0],
            changePct: values[0] !== 0
              ? ((values[values.length - 1] - values[0]) / values[0]) * 100
              : null,
          }
        : null;

      return {
        points: samplePoints(points, MAX_POINTS).map((p) => ({
          t: p.captured_at,
          f: p.floor,
          s: p.latest_sale,
        })),
        summary,
        totalPoints: points.length,
      };
    });
    return json({ item_key: itemKey, hours, ...data });
  } catch (err) {
    console.error('[api/prices/chart] error:', err);
    return json({ error: 'internal error' }, 500);
  }
};
