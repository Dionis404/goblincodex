import type { APIRoute } from 'astro';
import { fetchAuctionResults } from '../../../../lib/auctionsApi';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const auctionId = params.id!;
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });

  const results = await fetchAuctionResults(auctionId);
  if (!results) return json({ error: 'not found' }, 404);
  return json(results);
};
