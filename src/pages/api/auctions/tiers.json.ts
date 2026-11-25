import type { APIRoute } from 'astro';
import { getCurrentChapter, getUpcomingChapter } from '../../../lib/chapters';
import { analyzeAuctionTiers } from '../../../lib/auctionTiers';
import { getCachedCatalogItems } from '../../../lib/catalog-cache';
import { cachedJsonResponse, errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

// Анализ тиров аукционов для вкладки «Тиры» центра аукционов на странице
// главы — те же данные, что SSR страницы /codex/chapter/auction-tiers, но
// клиент тянет их только при открытии вкладки. Спрайт и бонусы предмета
// кладём прямо в строки, чтобы клиенту не нужен был весь каталог.
// Кэш 30 мин: анализ ходит по результатам всех завершённых дропов главы.
export const GET: APIRoute = async () => {
  try {
    const chapter = getUpcomingChapter() ?? getCurrentChapter();
    if (!chapter) {
      return cachedJsonResponse({ chapterName: null, rows: [], pending: [] }, true);
    }

    const { data: items } = await getCachedCatalogItems();
    const itemCatalog = Object.fromEntries(items.map((i) => [i.name, i]));

    const analysis = await analyzeAuctionTiers(
      new Date(chapter.startDate).getTime(),
      new Date(chapter.endDate).getTime(),
      (name) => {
        const entry = itemCatalog[name];
        return entry ? entry.boosts.length > 0 : true;
      },
    );

    // NFT-лоты (питомцы) в каталоге не лежат — игра рисует для них яйцо.
    const NFT_SPRITES: Record<string, string> = { Pet: 'icons/pet_nft_egg.png' };
    const enrich = <T extends { name: string }>(r: T) => ({
      ...r,
      sprite: itemCatalog[r.name]?.sprite ?? NFT_SPRITES[r.name] ?? null,
      boosts: (itemCatalog[r.name]?.boosts ?? []).map((b) => ({
        labelType: b.labelType,
        text: b.shortDescriptionRu || b.shortDescription,
      })),
    });

    return cachedJsonResponse({
      chapterName: chapter.name,
      chapterOrder: chapter.order,
      ...analysis,
      rows: analysis.rows.map(enrich),
      pending: analysis.pending.map(enrich),
    }, false, 1800);
  } catch (err) {
    return errorJsonResponse(err, '[api/auctions/tiers]');
  }
};
