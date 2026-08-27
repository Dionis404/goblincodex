import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const at = url.searchParams.get('at');
  const target = new URL('http://goblin-api:8000/api/tickets/top500');
  if (at) target.searchParams.set('at', at);

  try {
    const res = await fetch(target);
    if (!res.ok) return json({ updated_at: null, leaderboard: [] }, 502);
    const data = await res.json();
    return json(data);
  } catch (e) {
    console.error('Tickets leaderboard API error:', e);
    return json({ updated_at: null, leaderboard: [] }, 502);
  }
};
