import type { APIRoute } from 'astro';
import { getCachedPetsCommon } from '../../lib/catalog-cache';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { data: pets, cached } = await getCachedPetsCommon();
    return cachedJsonResponse({ pets }, cached);
  } catch (err) {
    return errorJsonResponse(err);
  }
};
