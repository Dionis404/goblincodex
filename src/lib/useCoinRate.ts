import { useItemPrices } from './useItemPrices';
import { NO_COIN_SELL_BOOSTS, SELLABLE_PRICE_NAMES, coinRateRows, coinRateSummary, type CoinRateSummary } from './coinRate';

/**
 * Рыночный курс монет (медиана «монет за 1 Flower» по урожаю/фруктам у Бетти,
 * без личных бустов) — общий для всех калькуляторов, где цена в монетах
 * пересчитывается во Flower. Тот же набор имён, что у раздела «Курс монет»,
 * поэтому запрос цен общий (useItemPrices кэширует по набору имён).
 *
 * undefined — цены ещё грузятся; null — посчитать не из чего.
 */
export function useCoinRate(): { rate: number | null | undefined; summary: CoinRateSummary | null } {
  const prices = useItemPrices(SELLABLE_PRICE_NAMES);
  if (prices == null) return { rate: undefined, summary: null };
  const summary = coinRateSummary(coinRateRows(prices, NO_COIN_SELL_BOOSTS));
  return { rate: summary.median, summary };
}
