/**
 * Калькулятор выгодности добычи Sunflower Land — чистая логика расчёта.
 *
 * Здесь нет ничего про DOM или React: только формулы. Так их легко читать,
 * тестировать и переиспользовать. UI (React-остров) просто вызывает calculate().
 *
 * Экономика взята из открытого репозитория игры и сверена с оригинальным
 * калькулятором. Все цены — в FLOWER (P2P-рынок sfl.world отдаёт цены в FLOWER).
 * COIN-часть стоимости инструмента переводится в FLOWER через курс coinRate.
 */

// Ресурсы, которые умеет считать MVP (дерево + базовые руды).
// Crimstone и Salt оставлены в типах, но на старте не показываем — добавим позже.
export type Resource = 'Wood' | 'Stone' | 'Iron' | 'Gold';

export const RESOURCES: Resource[] = ['Wood', 'Stone', 'Iron', 'Gold'];

/** Человекочитаемые подписи (какой инструмент добывает ресурс). */
export const RESOURCE_LABELS: Record<Resource, string> = {
  Wood: 'Wood (топор)',
  Stone: 'Stone (деревянная кирка)',
  Iron: 'Iron (каменная кирка)',
  Gold: 'Gold (железная кирка)',
};

/**
 * Базовая стоимость одного инструмента в COIN (внутриигровая валюта).
 * Значения из механики игры: топор и базовые кирки — 20, железная кирка — 80.
 */
const TOOL_BASE_COIN: Record<Resource, number> = {
  Wood: 20,
  Stone: 20,
  Iron: 20,
  Gold: 80,
};

/**
 * Рецепты инструментов: сколько ресурсов-ингредиентов нужно, помимо COIN.
 * Например, каменная кирка (Stone) требует 3 единицы Wood.
 * В режиме «рыночная база» ингредиенты оцениваются по рыночной цене.
 */
const TOOL_RECIPES: Record<Resource, Partial<Record<Resource, number>>> = {
  Wood: {}, // топор: только COIN
  Stone: { Wood: 3 }, // деревянная кирка: 3 Wood
  Iron: { Wood: 3, Stone: 5 }, // каменная кирка: 3 Wood + 5 Stone
  Gold: { Wood: 3, Iron: 5 }, // железная кирка: 3 Wood + 5 Iron
};

/** Дефолтный средний дроп ресурса с одного инструмента (как в оригинале). */
export const DEFAULT_YIELDS: Record<Resource, number> = {
  Wood: 1.9,
  Stone: 2.39,
  Iron: 2.15,
  Gold: 1.8,
};

/** Запасные цены (FLOWER) на случай, если API недоступен. */
export const FALLBACK_PRICES: Record<Resource, number> = {
  Wood: 0.011986,
  Stone: 0.020139,
  Iron: 0.07709756,
  Gold: 0.3068,
};

/** Какой скилл даёт скидку −20% на инструмент для конкретного ресурса. */
export type Skills = {
  fellerDiscount: boolean; // -20% на топоры (Wood)
  frugalMiner: boolean; // -20% на все кирки (Stone/Iron/Gold)
};

export type CalcInput = {
  /** Цены ресурсов в FLOWER (с рынка или fallback). */
  prices: Record<Resource, number>;
  /** Средний дроп с одного инструмента. */
  yields: Record<Resource, number>;
  /** Активные скиллы скидок. */
  skills: Skills;
  /** Курс: сколько COIN стоит 1 FLOWER (по умолчанию 1000). */
  coinRate: number;
  /** Комиссия P2P-рынка долей единицы (0.1 = 10%). */
  p2pFee: number;
};

export type ResourceResult = {
  resource: Resource;
  /** Рыночная цена продажи (брутто, FLOWER). */
  marketPrice: number;
  /** Чистая цена продажи после комиссии (FLOWER). */
  netSellPrice: number;
  /** Себестоимость одного инструмента (FLOWER). */
  toolCost: number;
  /** Себестоимость единицы ресурса = toolCost / yield (FLOWER). */
  unitCost: number;
  /** Прибыль на единицу = netSellPrice - unitCost (FLOWER). */
  profitPerUnit: number;
  /** Прибыль с одного инструмента = profitPerUnit * yield (FLOWER). */
  profitPerTool: number;
  /** Выгодно ли продавать (profit > 0). */
  profitable: boolean;
};

/** Перевод COIN → FLOWER через курс. */
function coinToFlower(coins: number, coinRate: number): number {
  const rate = Math.max(0.0001, coinRate);
  return coins / rate;
}

/** COIN-стоимость инструмента с учётом скидки скилла. */
function toolCoinCost(resource: Resource, skills: Skills): number {
  const base = TOOL_BASE_COIN[resource];
  if (resource === 'Wood') return skills.fellerDiscount ? base * 0.8 : base;
  return skills.frugalMiner ? base * 0.8 : base;
}

/**
 * Себестоимость одного инструмента в FLOWER (режим «рыночная база»):
 * COIN-часть, переведённая в FLOWER, плюс стоимость ингредиентов по рынку.
 */
function toolCostFlower(resource: Resource, input: CalcInput): number {
  const coinPart = coinToFlower(toolCoinCost(resource, input.skills), input.coinRate);
  let ingredientsPart = 0;
  const recipe = TOOL_RECIPES[resource];
  for (const [ing, qty] of Object.entries(recipe) as [Resource, number][]) {
    ingredientsPart += qty * (input.prices[ing] ?? 0);
  }
  return coinPart + ingredientsPart;
}

/** Главная функция: считает результат по всем ресурсам. */
export function calculate(input: CalcInput): ResourceResult[] {
  return RESOURCES.map((resource) => {
    const marketPrice = input.prices[resource] ?? NaN;
    const netSellPrice = marketPrice * (1 - input.p2pFee);

    const yieldVal = Math.max(0.0001, input.yields[resource] ?? 0.0001);
    const toolCost = toolCostFlower(resource, input);
    const unitCost = toolCost / yieldVal;

    const profitPerUnit = netSellPrice - unitCost;
    const profitPerTool = profitPerUnit * yieldVal;

    return {
      resource,
      marketPrice,
      netSellPrice,
      toolCost,
      unitCost,
      profitPerUnit,
      profitPerTool,
      profitable: profitPerUnit > 0,
    };
  });
}

/**
 * Нормализация ответа sfl.world. API отдаёт цены в разных вложенностях
 * (data.p2p, p2p, плоский объект), а ключи — в разном регистре. Сводим к
 * Record<Resource, number>. Если ресурса нет — берём fallback.
 */
export function normalizePrices(raw: unknown): Record<Resource, number> {
  const flat: Record<string, number> = {};

  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === 'number') {
        flat[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = v;
      } else if (v && typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        const candidate = Number(obj.price ?? obj.floorPrice ?? obj.amount ?? obj.value);
        if (Number.isFinite(candidate)) {
          flat[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = candidate;
        }
        walk(v);
      }
    }
  };
  walk(raw);

  const out = {} as Record<Resource, number>;
  for (const r of RESOURCES) {
    const key = r.toLowerCase();
    out[r] = Number.isFinite(flat[key]) ? flat[key] : FALLBACK_PRICES[r];
  }
  return out;
}
