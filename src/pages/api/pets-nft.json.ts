import type { APIRoute } from 'astro';
import { getCachedPetsNft } from '../../lib/catalog-cache';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { data, cached } = await getCachedPetsNft();
    return cachedJsonResponse(data, cached);
  } catch (err) {
    return errorJsonResponse(err);
  }
};
