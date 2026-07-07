import type { APIRoute } from 'astro';
import { searchPetNftInstances } from '../../../../lib/db';

export const prerender = false;

const MAX_LIMIT = 60;

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const petIdParam = parseInt(params.get('petId') ?? '', 10);
  const filter = {
    petId: Number.isInteger(petIdParam) ? petIdParam : undefined,
    type: params.get('type') || undefined,
    fur: params.get('fur') || undefined,
    accessory: params.get('accessory') || undefined,
    bib: params.get('bib') || undefined,
    aura: params.get('aura') || undefined,
  };

  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '', 10) || MAX_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(params.get('offset') ?? '', 10) || 0, 0);

  try {
    const { rows, total } = await searchPetNftInstances(filter, limit, offset);
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
