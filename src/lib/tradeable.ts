// Хелперы над tradeableData.generated.ts (сгенерирован из исходников игры
// скриптом scripts/sync-tradeable-data.ts): что разрешено торговать на
// маркетплейсе по коду Sunflower Land. Страница истории цен фильтрует
// списки этими функциями — исключения определены игрой, а не активностью рынка.
import {
  PET_NFT_TRADE_WINDOWS,
  TRADE_RESOURCE_LIMITS,
  TRADEABLE_COLLECTIBLES,
  TRADEABLE_WEARABLES,
} from './tradeableData.generated';

const collectibleMap = new Map(TRADEABLE_COLLECTIBLES.map((e) => [e.name.toLowerCase(), e.tradeAt]));
const wearableMap = new Map(TRADEABLE_WEARABLES.map((e) => [e.name.toLowerCase(), e.tradeAt]));

/** Коллекционка открыта для торговли (есть в INVENTORY_RELEASES игры и tradeAt наступил). */
export function isCollectibleTradeable(name: string, now: number = Date.now()): boolean {
  const tradeAt = collectibleMap.get(name.toLowerCase());
  return tradeAt != null && Date.parse(tradeAt) <= now;
}

/** Одежда открыта для торговли (есть в WEARABLE_RELEASES игры и tradeAt наступил). */
export function isWearableTradeable(name: string, now: number = Date.now()): boolean {
  const tradeAt = wearableMap.get(name.toLowerCase());
  return tradeAt != null && Date.parse(tradeAt) <= now;
}

/** Ресурс входит в TRADE_LIMITS игры (торгуется на маркетплейсе). Obsidian/Oil
 *  туда НЕ входят — они исключены из торговли явно. */
export function isTradeResource(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(TRADE_RESOURCE_LIMITS, name);
}

/** Дата открытия торговли питомца по id (PET_NFT_REVEAL_CONFIG игры); null — не торгуется. */
export function petTradeAt(petId: number): string | null {
  const window = PET_NFT_TRADE_WINDOWS.find((w) => petId >= w.startId && petId <= w.endId);
  return window?.tradeAt ?? null;
}

export function isPetTradeable(petId: number, now: number = Date.now()): boolean {
  const tradeAt = petTradeAt(petId);
  return tradeAt != null && Date.parse(tradeAt) <= now;
}

/** Имена коллекционок, открытых для торговли на данный момент. */
export function tradeableCollectibleNames(now: number = Date.now()): string[] {
  return TRADEABLE_COLLECTIBLES.filter((e) => Date.parse(e.tradeAt) <= now).map((e) => e.name);
}

/** Имена одежды, открытой для торговли на данный момент. */
export function tradeableWearableNames(now: number = Date.now()): string[] {
  return TRADEABLE_WEARABLES.filter((e) => Date.parse(e.tradeAt) <= now).map((e) => e.name);
}
