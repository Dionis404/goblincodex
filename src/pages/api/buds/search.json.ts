import type { APIRoute } from 'astro';
import { searchBudInstances } from '../../../lib/db';

export const prerender = false;

const MAX_LIMIT = 60;

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const budIdParam = parseInt(params.get('budId') ?? '', 10);
  const filter = {
    budId: Number.isInteger(budIdParam) ? budIdParam : undefined,
    type: params.get('type') || undefined,
    colour: params.get('colour') || undefined,
    stem: params.get('stem') || undefined,
    aura: params.get('aura') || undefined,
    ears: params.get('ears') || undefined,
  };

  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '', 10) || MAX_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(params.get('offset') ?? '', 10) || 0, 0);

  try {
    const { rows, total } = await searchBudInstances(filter, limit, offset);
    return new Response(JSON.stringify({ items: rows, total }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
