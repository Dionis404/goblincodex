import type { APIRoute } from 'astro';
import { getEmbedding } from '../../lib/routerai';
import { searchByEmbedding } from '../../lib/db';
import { errorJsonResponse } from '../../lib/cache';

export const prerender = false;

const MAX_LIMIT = 10;
// Каждый запрос — платный эмбеддинг routerai; длинный текст и стоит дороже,
// и для поиска по справочнику не нужен.
const MAX_QUERY_LENGTH = 200;

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '', 10) || 6, 1), MAX_LIMIT);

  if (!query || query.length > MAX_QUERY_LENGTH) {
    return new Response(JSON.stringify({ error: `query param "q" is required (max ${MAX_QUERY_LENGTH} chars)` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const embedding = await getEmbedding(query);
    const results = await searchByEmbedding(embedding, limit);
    return new Response(JSON.stringify({ query, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return errorJsonResponse(err, '[api/search]');
  }
};
