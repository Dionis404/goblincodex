// Cached wrappers around the read-only src/lib/db.ts getters, shared by both
// .astro pages (SSR props) and /api/*.json routes. Using the same cached
// function in both places matters: previously codex/index.astro and
// chapter.astro called getCatalogItems() directly on every page view, while
// only the (unused-by-the-site) nft-catalog.json.ts route had a cache — so
// the busiest pages never actually benefited from it.

import { withTtlCache } from './cache';
import {
  getCatalogItems,
  getBudTraits,
  getBudInstances,
  getBudFilterOptions,
  getPetNftBreeds,
  getPetNftTraits,
  getPetNftInstances,
  getPetNftFilterOptions,
  getPetsCommon,
  getPetResources,
  getPetFetches,
} from './db';

const TTL_MS = 10 * 60 * 1000; // 10 min

export function getCachedCatalogItems() {
  return withTtlCache('catalog-items', TTL_MS, getCatalogItems, { swr: true });
}

export function getCachedBuds() {
  return withTtlCache('buds', TTL_MS, async () => ({
    traits: await getBudTraits(),
    instances: await getBudInstances(),
    filterOptions: await getBudFilterOptions(),
  }), { swr: true });
}

export function getCachedPetsNft() {
  return withTtlCache('pets-nft', TTL_MS, async () => ({
    breeds: await getPetNftBreeds(),
    traits: await getPetNftTraits(),
    instances: await getPetNftInstances(),
    filterOptions: await getPetNftFilterOptions(),
  }), { swr: true });
}

export function getCachedPetsCommon() {
  return withTtlCache('pets-common', TTL_MS, getPetsCommon, { swr: true });
}

export function getCachedPetMechanics() {
  return withTtlCache('pet-mechanics', TTL_MS, async () => ({
    resources: await getPetResources(),
    fetches: await getPetFetches(),
  }), { swr: true });
}
