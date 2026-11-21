// Фоновый прогрев кэшей после старта процесса. Кэши in-process: после
// рестарта/деплоя контейнера они пустые, и первый же посетитель /codex
// оплачивал бы все холодные запросы к Postgres и sfl-api (бывало >40 с
// до ответа страницы). Прогреваем всё сразу при первом HTTP-запросе —
// дальше SSR-страницы и /api-роуты берут данные из кэша.
import {
  getCachedBudsMeta,
  getCachedPetsNftMeta,
  getCachedPetsCommon,
  getCachedPetMechanics,
  getCachedCatalogItems,
} from './catalog-cache';
import { fetchSflJsonCached } from './sflApi';

export function warmupCaches(): void {
  const jobs: Array<() => Promise<unknown>> = [
    getCachedBudsMeta,
    getCachedPetsNftMeta,
    getCachedPetsCommon,
    getCachedPetMechanics,
    getCachedCatalogItems,
    () => fetchSflJsonCached('/community/farmers'),
    () => fetchSflJsonCached('/api/tickets/top500'),
  ];
  for (const job of jobs) {
    job().catch((err) => console.warn('[warmup] прогрев ключа не удался:', err));
  }
}
