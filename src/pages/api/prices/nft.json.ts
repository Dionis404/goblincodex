import type { APIRoute } from 'astro';
import { fetchPriceResources } from '../../../lib/priceApi';
import { getBudInstancesByIds, getPetNftInstancesByIds } from '../../../lib/db';
import { isPetTradeable } from '../../../lib/tradeable';
import { cachedJsonResponse, errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

// Минт-NFT (Buds / питомцы), которые видит sfl-price-service: для каждого
// инстанса подтягиваем картинку и породу/тип из нашей БД. Отсечение «не
// торгуется» — по коду игры (src/lib/tradeable.ts): питомцы открываются для
// торговли по расписанию глав (petRevealConfig), Buds торгуются все.
const MAX_ITEMS = 1500;

export const GET: APIRoute = async ({ url }) => {
  const categoryParam = url.searchParams.get('category');
  const category = categoryParam === 'pets' ? 'pets' : 'buds';

  try {
    const resources = await fetchPriceResources(category);
    const ids = [
      ...new Set(
        resources
          .map((r) => Number(r.item_key.match(/(\d+)$/)?.[1]))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const now = Date.now();
    const eligible = category === 'pets' ? ids.filter((id) => isPetTradeable(id, now)) : ids;

    const instances = category === 'pets'
      ? await getPetNftInstancesByIds(eligible)
      : await getBudInstancesByIds(eligible);

    const items = instances
      .slice(0, MAX_ITEMS)
      .map((i) => {
        const id = category === 'pets' ? (i as { petId: number }).petId : (i as { budId: number }).budId;
        return {
          id,
          item_key: `${category}-${id}`,
          image_url: i.imageUrl,
          title: category === 'pets' ? `Pet #${id}` : `Bud #${id}`,
          subtitle: i.type,
        };
      });

    return cachedJsonResponse({ category, items, truncated: instances.length > MAX_ITEMS }, true, 300);
  } catch (err) {
    return errorJsonResponse(err, '[api/prices/nft]');
  }
};
