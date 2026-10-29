/**
 * Оценка заказов sfl-collector (доставки за билеты, баунти Поппи и животных,
 * задания недели): сколько Flower стоят сданные ресурсы по рынку и сколько
 * Flower выходит за одну награду. Без личных бустов игрока.
 *
 * Цена предмета: рынок → себестоимость (стойки Aging Shed, компостер, блюда
 * по рецепту) → инструменты (монеты по курсу + ресурсы) → монеты по курсу.
 */
import { NO_AGING_BOOSTS, FERMENTATION_PRICE_NAMES, createPricer } from './fermentation';
import { FOOD_PRICE_NAMES, RECIPE_BY_NAME, recipeCost } from './food';
import { NO_OIL_BOOSTS, NO_TOOL_BOOSTS, TOOLS, TOOL_PRICE_NAMES, oilUnitCost, toolIngredients, toolUnitPrice } from './toolCosts';
import { NO_COIN_SELL_BOOSTS, SELLABLE_PRICE_NAMES, coinRateRows, coinRateSummary } from './coinRate';
import { ANIMAL_PRICE_NAMES, ANIMALS, NO_ANIMAL_BOOSTS, cycleRow, type AnimalType } from './animals';
import { ANIMAL_COINS } from './animalData.generated';

export type PriceSource = 'market' | 'recipe' | 'compost' | 'coins' | 'tool' | 'food' | null;

export interface CostLine {
  name: string;
  amount: number;
  /** Flower за 1 шт.; null — оценить не из чего. */
  unit: number | null;
  source: PriceSource;
}

export interface Basket {
  lines: CostLine[];
  /** Сумма во Flower; null — хотя бы у одной позиции нет цены. */
  total: number | null;
  /** Сумма только по позициям с ценой (нижняя граница, если что-то не оценено). */
  known: number;
  missing: string[];
}

/** Все имена, чьи рыночные цены нужны оценщику (кроме самих предметов заказов). */
export const VALUER_PRICE_NAMES: string[] = [
  ...new Set([...SELLABLE_PRICE_NAMES, ...FERMENTATION_PRICE_NAMES, ...FOOD_PRICE_NAMES, ...TOOL_PRICE_NAMES, ...ANIMAL_PRICE_NAMES]),
];

/** Курс монет (монет за 1 Flower) из тех же цен — как useCoinRate на клиенте. */
export function coinRateFrom(prices: Record<string, number | null>): number | null {
  return coinRateSummary(coinRateRows(prices, NO_COIN_SELL_BOOSTS)).rate;
}

export function createValuer(prices: Record<string, number | null>, coinRate: number | null) {
  const pricer = createPricer(prices, coinRate, NO_AGING_BOOSTS);
  const memo = new Map<string, { unit: number | null; source: PriceSource }>();

  const coins = (n: number) => (coinRate ? n / coinRate : null);

  function oilUnit(): number | null {
    const cost = oilUnitCost(NO_TOOL_BOOSTS, NO_OIL_BOOSTS);
    const res = basket(cost.resources as Record<string, number>).total;
    const c = coins(cost.coins);
    return res == null || c == null ? null : res + c;
  }

  function unit(name: string): { unit: number | null; source: PriceSource } {
    const hit = memo.get(name);
    if (hit) return hit;
    let result: { unit: number | null; source: PriceSource } = { unit: null, source: null };
    const tool = TOOLS.find((t) => t.name === name);
    if (name === 'coins') {
      result = { unit: coins(1), source: 'coins' };
    } else if (name === 'Oil') {
      result = { unit: oilUnit(), source: 'tool' };
    } else if (tool) {
      memo.set(name, result); // защита от циклов
      const res = basket(toolIngredients(tool, NO_TOOL_BOOSTS) as Record<string, number>).total;
      const c = coins(toolUnitPrice(tool, NO_TOOL_BOOSTS));
      result = { unit: res == null || c == null ? null : res + c, source: 'tool' };
    } else {
      const p = pricer.unitPrice(name);
      if (p.unit != null) result = { unit: p.unit, source: p.source };
      else if (RECIPE_BY_NAME.has(name)) {
        const r = recipeCost(name, prices);
        result = { unit: r.missing.length ? null : r.cost, source: 'food' };
      }
    }
    memo.set(name, result);
    return result;
  }

  function basket(items: Record<string, number>): Basket {
    const lines = Object.entries(items).map(([name, amount]) => ({ name, amount, ...unit(name) }));
    const missing = lines.filter((l) => l.unit == null).map((l) => l.name);
    const known = lines.reduce((s, l) => s + (l.unit ?? 0) * l.amount, 0);
    return { lines, missing, known, total: missing.length ? null : known };
  }

  /**
   * Сдача животного в баунти: животное удаляется (sellAnimal), поэтому цена —
   * покупка нового за монеты + корм с 0 до уровня (2 поглаживания в сон, любимый корм).
   */
  function animal(a: AnimalType, level: number): { total: number | null; feed: number | null; buy: number | null } {
    const buy = coins(ANIMAL_COINS[a]);
    let feed: number | null = 0;
    for (let l = 0; l < level && feed != null; l++) {
      const c = cycleRow(a, l, NO_ANIMAL_BOOSTS, prices).feedCost;
      feed = c == null ? null : feed + c;
    }
    return { buy, feed, total: buy == null || feed == null ? null : buy + feed };
  }

  return { unit, basket, animal, coins };
}

export const isAnimal = (name: string): name is AnimalType => (ANIMALS as string[]).includes(name);

// ─── Задания недели ──────────────────────────────────────────────────────────

export interface ChoreSpend {
  /** Что тратится на задание; null — задание без прямого расхода (сбор, урожай). */
  items: Record<string, number> | null;
  note: string;
}

/** Инструмент на одно действие (без навыков, экономящих инструменты). */
const ACTION_TOOLS: [RegExp, string][] = [
  [/^Chop Trees (\d+) times$/i, 'Axe'],
  [/^Mine Stones? (\d+) times$/i, 'Pickaxe'],
  [/^Mine Iron (\d+) times$/i, 'Stone Pickaxe'],
  [/^Mine Gold (\d+) times$/i, 'Iron Pickaxe'],
  [/^Mine Crimstones? (\d+) times$/i, 'Gold Pickaxe'],
  [/^Fish (\d+) times$/i, 'Rod'],
  [/^Dig (\d+) times$/i, 'Sand Shovel'],
];

/** «Lemon Cheesecakes» → «Lemon Cheesecake»: имя из списка, единственное число. */
function singular(name: string, known: (n: string) => boolean): string | null {
  for (const n of [name, name.replace(/es$/, ''), name.replace(/s$/, '')]) if (known(n)) return n;
  return null;
}

const isTool = (n: string) => TOOLS.some((t) => t.name === n);
const isDish = (n: string) => RECIPE_BY_NAME.has(n);

export function choreSpend(task: string): ChoreSpend {
  for (const [re, tool] of ACTION_TOOLS) {
    const m = task.match(re);
    if (m) return { items: { [tool]: Number(m[1]) }, note: `${tool} на каждое действие` };
  }
  let m = task.match(/^(?:Cook|Prepare) (.+?) (\d+) times$/i);
  if (m) {
    const dish = singular(m[1], isDish);
    return dish ? { items: { [dish]: Number(m[2]) }, note: 'ингредиенты блюда' } : { items: null, note: `нет рецепта «${m[1]}»` };
  }
  m = task.match(/^Craft (\d+) (.+)$/i) ?? task.match(/^Craft (.+?) (\d+) times$/i);
  if (m) {
    const [count, raw] = /^\d+$/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
    const tool = singular(raw, isTool);
    return tool ? { items: { [tool]: Number(count) }, note: 'цена инструментов' } : { items: null, note: `нет рецепта «${raw}»` };
  }
  return { items: null, note: 'без прямого расхода' };
}
