import type { APIRoute } from 'astro';
import { getCurrentChapter } from '../../../lib/chapters';
import { fetchAuctionsInRange } from '../../../lib/auctionsApi';
import { cachedJsonResponse, errorJsonResponse } from '../../../lib/cache';

export const prerender = false;

// Расписание аукционов текущей главы для ChapterAuctions на /codex — раньше
// аукционы и весь itemCatalog приезжали пропсами в HTML (~740K сериализованного
// JSON на каждый просмотр страницы). Теперь компонент тянет этот эндпоинт,
// когда вкладка главы реально открыта. Данные те же, что раньше собирались в
// ChapterContent.astro: fetchAuctionsInRange сам кэшируется на 10 мин
// (см. src/lib/auctionsApi.ts), повторных запросов к goblin-api не будет.

export const GET: APIRoute = async () => {
  try {
    const chapter = getCurrentChapter();
    if (!chapter) {
      return cachedJsonResponse({ chapterName: null, startAt: null, endAt: null, auctions: [] }, true);
    }
    const startAt = new Date(chapter.startDate).getTime();
    const endAt = new Date(chapter.endDate).getTime();
    const auctions = await fetchAuctionsInRange(startAt, endAt);
    return cachedJsonResponse({
      chapterName: chapter.name,
      startAt,
      endAt,
      auctions,
    }, false, 300);
  } catch (err) {
    return errorJsonResponse(err, '[api/auctions/chapter]');
  }
};
