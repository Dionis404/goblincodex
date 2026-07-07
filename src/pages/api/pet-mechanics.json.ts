import type { APIRoute } from 'astro';
import { getCachedPetMechanics } from '../../lib/catalog-cache';
import { cachedJsonResponse, errorJsonResponse } from '../../lib/cache';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { data, cached } = await getCachedPetMechanics();
    return cachedJsonResponse(data, cached);
  } catch (err) {
    return errorJsonResponse(err);
  }
};
