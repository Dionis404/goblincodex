import { getCollection, type CollectionEntry } from 'astro:content';

// Короткие ссылки /news/{shortId} резолвятся через это, а не через
// getEntry('news', id) — id коллекции это длинный filename-slug,
// shortId лежит в data и не совпадает с ним.
export async function getEntryByShortId(shortId: string | number): Promise<CollectionEntry<'news'> | undefined> {
  const n = Number(shortId);
  if (!Number.isInteger(n)) return undefined;

  const entries = await getCollection('news', ({ data }) => !data.draft);
  return entries.find(e => e.data.shortId === n);
}
