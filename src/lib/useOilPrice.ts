import { useItemPrices } from './useItemPrices';
import { useCoinRate } from './useCoinRate';
import { NO_OIL_BOOSTS, NO_TOOL_BOOSTS, oilFlowerPrice, oilUnitCost } from './toolCosts';

// Ресурсы рецепта Oil Drill без навыков (Oil Rig меняет кожу на шерсть).
const OIL_DRILL_RESOURCES = ['Wood', 'Iron', 'Leather'];

/**
 * Цена 1 нефти во Flower по себестоимости добычи без бустов: (монеты Oil
 * Drill по курсу + его ресурсы по floor) ÷ средний выход 16.67 нефти с бура.
 * На маркетплейсе нефть не торгуется — так её считают таблицы, где она
 * ингредиент (Lava Pit, расширения). Персональные бусты добычи — только в
 * калькуляторе инструментов.
 *
 * undefined — цены ещё грузятся; null — посчитать не из чего.
 */
export function useOilPrice(): number | null | undefined {
  const prices = useItemPrices(OIL_DRILL_RESOURCES);
  const { rate } = useCoinRate();
  if (prices == null || rate === undefined) return undefined;
  const cost = oilUnitCost(NO_TOOL_BOOSTS, NO_OIL_BOOSTS);
  const resources = oilFlowerPrice(cost, prices);
  if (resources == null) return null;
  return resources + (rate ? cost.coins / rate : 0);
}
