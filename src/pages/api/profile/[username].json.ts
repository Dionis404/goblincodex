import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../lib/goblinApi';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const username = params.username!.toLowerCase();
  const json = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const res = await fetchWithTimeout('http://goblin-api:8000/community/farmers');
    if (!res.ok) return json(null);
    const farmers: any[] = await res.json();
    const farmer = farmers.find(f => f.game_username?.toLowerCase() === username) ?? null;
    return json(farmer);
  } catch {
    return json(null);
  }
};
