import type { APIRoute } from 'astro';
import { getEmbedding } from '../../lib/routerai';
import { searchByEmbedding } from '../../lib/db';

export const prerender = false;

const MAX_LIMIT = 10;

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') ?? '').trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '', 10) || 6, 1), MAX_LIMIT);

  if (!query) {
    return new Response(JSON.stringify({ error: 'query param "q" is required' }), {
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
    console.error('[api/search] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
