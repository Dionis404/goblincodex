import type { APIRoute } from 'astro';
import { fetchSflJsonCached } from '../../../lib/sflApi';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const username = params.username!.toLowerCase();
  const json = (data: unknown) =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const farmers: any[] = await fetchSflJsonCached('/community/farmers');
    const farmer = farmers.find(f => f.game_username?.toLowerCase() === username) ?? null;
    return json(farmer);
  } catch {
    return json(null);
  }
};
