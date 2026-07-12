import type { APIRoute } from 'astro';
import { withTtlCache, cachedJsonResponse, errorJsonResponse } from '../../lib/cache';
import { getPrngChances } from '../../lib/db';
import { dbLookupNames } from '../../lib/prngMechanics';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { data, cached } = await withTtlCache('prng-chances', 3600_000, () =>
      getPrngChances(dbLookupNames())
    );
    return cachedJsonResponse(data, cached, 3600);
  } catch (e) {
    return errorJsonResponse(e);
  }
};
