import type { APIRoute } from 'astro';
import { getCachedBuds } from '../../lib/catalog-cache';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { data, cached } = await getCachedBuds();
    return cachedJsonResponse(data, cached);
  } catch (err) {
    return errorJsonResponse(err);
  }
};
