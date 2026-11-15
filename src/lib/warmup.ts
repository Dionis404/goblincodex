// Фоновый прогрев кэшей после старта процесса. Кэши in-process: после
// рестарта/деплоя контейнера они пустые, и первый же посетитель /codex
// оплачивал бы все холодные запросы к Postgres и goblin-api (бывало >40 с
// до ответа страницы). Прогреваем всё сразу при первом HTTP-запросе —
// дальше SSR-страницы и /api-роуты берут данные из кэша.
import {
  getCachedBudsMeta,
  getCachedPetsNftMeta,
  getCachedPetsCommon,
  getCachedPetMechanics,
  getCachedCatalogItems,
} from './catalog-cache';
import { fetchGoblinJsonCached } from './goblinApi';

export function warmupCaches(): void {
  const jobs: Array<() => Promise<unknown>> = [
    getCachedBudsMeta,
    getCachedPetsNftMeta,
    getCachedPetsCommon,
    getCachedPetMechanics,
    getCachedCatalogItems,
    () => fetchGoblinJsonCached('/community/farmers'),
    () => fetchGoblinJsonCached('/api/tickets/top500'),
    () => fetchGoblinJsonCached('/lp/leaderboard'),
  ];
  for (const job of jobs) {
    job().catch((err) => console.warn('[warmup] прогрев ключа не удался:', err));
  }
}
