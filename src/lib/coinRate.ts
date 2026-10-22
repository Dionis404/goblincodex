/**
 * Курс монет к Flower через урожай и фрукты: Бетти покупает их за монеты,
 * на маркетплейсе они продаются за Flower — отношение цен и есть курс.
 *
 * Источник цен Бетти: sunflower-land repo —
 *   src/features/game/types/crops.ts (CROPS, GREENHOUSE_CROPS: sellPrice),
 *   src/features/game/types/fruits.ts (PATCH_FRUIT, GREENHOUSE_FRUIT),
 *   src/features/game/events/landExpansion/sellCrop.ts (SELLABLE),
 *   src/features/game/expansion/lib/boosts.ts (getSellPrice — бусты).
 * Не включены: культура недели главы (Crystal Leaf — временная, на рынке
 * только для VIP), списанная Saltwort (isRetiredChapterCropWeekItem) и
 * «нехватка урожая» (+100% к цене первые 2 часа нового аккаунта).
 */
import { SKILLS } from './skills';
import type { SkillRank } from './toolCosts';

export type SellableGroup = 'crop' | 'fruit' | 'greenhouse';

export const SELLABLE_GROUP_LABELS: Record<SellableGroup, string> = {
  crop: 'Урожай',
  fruit: 'Фрукты',
  greenhouse: 'Теплица',
};

export interface SellableDef {
  name: string;
  labelRu: string;
  icon: string;
  group: SellableGroup;
  /** Базовая цена у Бетти в монетах за 1 шт. */
  sellPrice: number;
}

const crop = (name: string, labelRu: string, folder: string, sellPrice: number): SellableDef => ({
  name, labelRu, icon: `/sprites/crops/${folder}/crop.png`, group: 'crop', sellPrice,
});

export const SELLABLES: SellableDef[] = [
  crop('Sunflower', 'Подсолнух', 'sunflower', 0.02),
  crop('Potato', 'Картофель', 'potato', 0.14),
  crop('Rhubarb', 'Ревень', 'rhubarb', 0.24),
  crop('Pumpkin', 'Тыква', 'pumpkin', 0.4),
  crop('Zucchini', 'Кабачок', 'zucchini', 0.4),
  crop('Carrot', 'Морковь', 'carrot', 0.8),
  crop('Yam', 'Ямс', 'yam', 0.8),
  crop('Cabbage', 'Капуста', 'cabbage', 1.5),
  crop('Broccoli', 'Брокколи', 'brocolli', 1.5),
  crop('Soybean', 'Соя', 'soybean', 2.3),
  crop('Beetroot', 'Свёкла', 'beetroot', 2.8),
  crop('Pepper', 'Перец', 'pepper', 3),
  crop('Cauliflower', 'Цветная капуста', 'cauliflower', 4.25),
  crop('Parsnip', 'Пастернак', 'parsnip', 6.5),
  crop('Wheat', 'Пшеница', 'wheat', 7),
  crop('Eggplant', 'Баклажан', 'eggplant', 8),
  crop('Turnip', 'Репа', 'turnip', 8),
  crop('Corn', 'Кукуруза', 'corn', 9),
  crop('Radish', 'Редис', 'radish', 9.5),
  crop('Onion', 'Лук', 'onion', 10),
  crop('Kale', 'Кейл', 'kale', 10),
  crop('Artichoke', 'Артишок', 'artichoke', 12),
  crop('Barley', 'Ячмень', 'barley', 12),
  { name: 'Tomato', labelRu: 'Томат', icon: '/sprites/fruit/tomato/tomato.webp', group: 'fruit', sellPrice: 2 },
  { name: 'Lemon', labelRu: 'Лимон', icon: '/sprites/resources/lemon.webp', group: 'fruit', sellPrice: 6 },
  { name: 'Blueberry', labelRu: 'Черника', icon: '/sprites/resources/blueberry.png', group: 'fruit', sellPrice: 12 },
  { name: 'Orange', labelRu: 'Апельсин', icon: '/sprites/resources/orange.png', group: 'fruit', sellPrice: 18 },
  { name: 'Apple', labelRu: 'Яблоко', icon: '/sprites/resources/apple.png', group: 'fruit', sellPrice: 25 },
  { name: 'Banana', labelRu: 'Банан', icon: '/sprites/resources/banana.png', group: 'fruit', sellPrice: 25 },
  { name: 'Celestine', labelRu: 'Селестина', icon: '/sprites/fruit/celestine/celestine.webp', group: 'fruit', sellPrice: 200 },
  { name: 'Lunara', labelRu: 'Лунара', icon: '/sprites/fruit/lunara/lunara.webp', group: 'fruit', sellPrice: 500 },
  { name: 'Duskberry', labelRu: 'Сумеречная ягода', icon: '/sprites/fruit/duskberry/duskberry.webp', group: 'fruit', sellPrice: 1000 },
  { name: 'Grape', labelRu: 'Виноград', icon: '/sprites/greenhouse/grape.webp', group: 'greenhouse', sellPrice: 240 },
  { name: 'Rice', labelRu: 'Рис', icon: '/sprites/greenhouse/rice.webp', group: 'greenhouse', sellPrice: 320 },
  { name: 'Olive', labelRu: 'Оливка', icon: '/sprites/greenhouse/olive.webp', group: 'greenhouse', sellPrice: 400 },
];

export const SELLABLE_PRICE_NAMES = SELLABLES.map((s) => s.name);

export interface CoinSellBoosts {
  /** Навык Coin Swindler: +10/20/30% монет за урожай (только CROPS). */
  coinSwindler: SkillRank;
  /** Старый навык Green Thumb в инвентаре (не новый с тем же именем): +5% за урожай. */
  greenThumbLegacy: boolean;
}

export const NO_COIN_SELL_BOOSTS: CoinSellBoosts = { coinSwindler: 0, greenThumbLegacy: false };

export function coinSwindlerRanks(): number[] {
  const effect = SKILLS.find((s) => s.name === 'Coin Swindler')?.upgrade?.effect as { ranks?: unknown } | undefined;
  return Array.isArray(effect?.ranks) ? (effect!.ranks as number[]) : [];
}

/**
 * Цена у Бетти с бустами — как getSellPrice: бонусы складываются в один
 * множитель (1 + …). Бусты действуют только на урожай грядок (CROPS):
 * фрукты и культуры теплицы (Rice, Olive, Grape) продаются по базовой цене.
 */
export function bettyPrice(item: SellableDef, b: CoinSellBoosts): number {
  if (item.group !== 'crop') return item.sellPrice;
  let multiplier = 1;
  if (b.greenThumbLegacy) multiplier += 0.05;
  if (b.coinSwindler > 0) multiplier += coinSwindlerRanks()[b.coinSwindler - 1] ?? 0;
  return item.sellPrice * multiplier;
}

export interface CoinRateRow {
  item: SellableDef;
  betty: number;
  /** floor на маркетплейсе во Flower; null — цены нет. */
  floor: number | null;
  /** Сколько монет даёт 1 Flower, потраченный на этот предмет: betty / floor. */
  coinsPerFlower: number | null;
}

export function coinRateRows(prices: Record<string, number | null>, b: CoinSellBoosts): CoinRateRow[] {
  return SELLABLES.map((item) => {
    const betty = bettyPrice(item, b);
    const floor = prices[item.name] ?? null;
    return { item, betty, floor, coinsPerFlower: floor && floor > 0 ? betty / floor : null };
  });
}

/** Сколько самых выгодных предметов усредняем для курса. */
export const COIN_RATE_TOP_N = 3;

export interface CoinRateSummary {
  /**
   * Курс: среднее «монет за 1 Flower» по COIN_RATE_TOP_N самым выгодным
   * предметам — реальная цена, по которой монеты можно получить сейчас
   * (купить на рынке и продать Бетти). Среднее по нескольким, а не один
   * лучший, — чтобы один случайный дешёвый лот не задавал курс.
   */
  rate: number | null;
  /** Предметы, из которых посчитан курс, от самого выгодного. */
  top: CoinRateRow[];
  /** Самый выгодный способ получить монеты (= top[0]). */
  best: CoinRateRow | null;
  priced: number;
}

export function coinRateSummary(rows: CoinRateRow[]): CoinRateSummary {
  const priced = rows
    .filter((r) => r.coinsPerFlower != null)
    .sort((a, b) => b.coinsPerFlower! - a.coinsPerFlower!);
  const top = priced.slice(0, COIN_RATE_TOP_N);
  const rate = top.length ? top.reduce((s, r) => s + r.coinsPerFlower!, 0) / top.length : null;
  return { rate, top, best: top[0] ?? null, priced: priced.length };
}

/**
 * Официальный обмен Flower → монеты в игре (SFL_TO_COIN_PACKAGES в
 * src/features/game/events/landExpansion/exchangeSFLtoCoins.ts) — ориентир:
 * купить монеты напрямую можно не дешевле этих пакетов.
 */
export const OFFICIAL_COIN_PACKAGES = [
  { flower: 1, coins: 160 },
  { flower: 30, coins: 8640 },
  { flower: 200, coins: 64000 },
] as const;

/** Монеты → Flower по курсу (монет за 1 Flower). */
export function coinsToFlower(coins: number, coinsPerFlower: number): number {
  return coins / coinsPerFlower;
}
