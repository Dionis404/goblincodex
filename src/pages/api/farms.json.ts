import type { APIRoute } from 'astro';
import { SFL_API_BASE, fetchWithTimeout } from '../../lib/sflApi';

export const prerender = false;

// Прокси на sfl-api: раньше /api/farms пробрасывал внешним правилом Caddy
// напрямую в goblin-api — скрытая зависимость, о которой знал только nginx-
// конфиг на сервере. Теперь роут обслуживает сам astro. Валидация ids —
// на стороне sfl-api (максимум 100 id за запрос), здесь только таймаут.
export const GET: APIRoute = async ({ url }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const ids = url.searchParams.get('ids') ?? '';
  const target = new URL(`${SFL_API_BASE}/farms`);
  target.searchParams.set('ids', ids);

  try {
    const res = await fetchWithTimeout(target.toString());
    const data = await res.json().catch(() => null);
    if (!res.ok) return json(data ?? { detail: `sfl-api HTTP ${res.status}` }, res.status);
    return json(data);
  } catch (e) {
    console.error('Farms API error:', e);
    return json({ detail: 'sfl-api недоступен' }, 502);
  }
};
