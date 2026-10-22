import { FlowerAmount } from '../ResourceIcon';
import FishingBoostsWidget from './FishingBoostsWidget';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { TOOL_PRICE_NAMES } from '../../lib/toolCosts';
import { CHUM_PRICE_NAMES, crustaceanIcon } from '../../lib/crustaceans';
import { SEASON_INFO, fishIcon, GUARANTEED_INFO } from '../../lib/fishCatalog';
import { BAIT_RECIPES } from '../../lib/fishData.generated';
import {
  BAITS,
  SEASON_NAMES,
  baitCosts,
  type BaitCost,
  type IngredientCost,
} from '../../lib/baitCosts';
import type { FishingBoosts } from '../../lib/fishYield';

/** Нужны цены ресурсов удочки (Wood, Stone) и ловушек/приманок ракообразных — рыба на рынке не торгуется. */
export const BAIT_RECIPE_PRICE_NAMES = [...new Set([...CHUM_PRICE_NAMES, ...TOOL_PRICE_NAMES])];

function formatTime(seconds: number): string {
  return `${seconds / 3600} ч`;
}

const INGREDIENT_TITLES: Record<IngredientCost['kind'], string> = {
  fish: 'Себестоимость рыбы: заброс удочки ÷ рыбы за заброс с вашими бустами',
  crustacean: 'Себестоимость из таблицы ловушек (самый дешёвый способ)',
  treasure: 'Выпадает при раскопках и как мусор при рыбалке, не торгуется — оценён по цене продажи в монетах',
  unknown: 'Нет цены',
};

function IngredientChip({ item }: { item: IngredientCost }) {
  const icon = fishIcon(item.name) ?? (item.kind === 'crustacean' ? crustaceanIcon(item.name) : null);
  return (
    <span className={`ref-bait-ing ref-bait-ing--${item.kind}`} title={INGREDIENT_TITLES[item.kind]}>
      {icon ? <img src={icon} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} /> : <span aria-hidden="true">🦀</span>}
      {item.amount}× {item.name}
    </span>
  );
}

function SeasonRow({ cost }: { cost: BaitCost }) {
  const info = SEASON_INFO[cost.season];
  return (
    <li className="ref-bait-season-row">
      <span className="ref-bait-season" title={info.label}>
        {info.emoji} <span className="ref-bait-season-name">{info.label}</span>
      </span>
      <span className="ref-bait-ings">
        {cost.ingredients.map((i) => <IngredientChip key={i.name} item={i} />)}
      </span>
      <span className="ref-bait-cost">
        {cost.total == null ? (
          <span className="ref-price-hint" title={`Нет цены: ${cost.missing.join(', ')}`}>нет цены</span>
        ) : (
          <>
            <span className="ref-price-hint">≈ </span>
            <FlowerAmount compact value={cost.total} />
          </>
        )}
      </span>
    </li>
  );
}

export default function BaitRecipes({
  fishing,
  onFishingChange,
}: {
  fishing: FishingBoosts;
  onFishingChange: (next: FishingBoosts) => void;
}) {
  const prices = useItemPrices(BAIT_RECIPE_PRICE_NAMES);
  const { rate: coinRate } = useCoinRate();
  const costs = prices ? baitCosts(prices, coinRate, fishing) : null;

  return (
    <div className="ref-bait-recipes-wrap">
      <FishingBoostsWidget boosts={fishing} onChange={onFishingChange} prices={prices} coinRate={coinRate} />
      <div className="ref-bait-recipes">
        {BAITS.map((bait) => (
          <div className="ref-bait-card ref-bait-recipe" key={bait}>
            <div className="ref-bait-header">
              <span className="ref-bait-name">
                <img src={GUARANTEED_INFO[bait].icon} alt="" className="gc-res-icon" /> {bait}
              </span>
              <span className="ref-bait-tier">изготовление {formatTime(BAIT_RECIPES[bait].seconds)}</span>
            </div>
            <ul className="ref-bait-season-list">
              {SEASON_NAMES.map((s) =>
                costs ? (
                  <SeasonRow key={s} cost={costs[bait][s]} />
                ) : (
                  <li className="ref-bait-season-row" key={s}>…</li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <p className="ref-section-desc">
        Рыба на маркетплейсе не торгуется, поэтому её цена — себестоимость: один заброс удочки
        (монеты по курсу монет, дерево и камень), делённый на то, сколько рыбы он даёт с вашими
        бонусами. Наживку-червя не считаем: это побочный продукт компостера. Ракообразные — из
        таблицы ловушек ниже, Crab (находка с раскопок и мусор при рыбалке) — по цене продажи в
        15 монет. Это оценка, не рыночная цена. Набор ингредиентов зависит от сезона года в игре.
      </p>
    </div>
  );
}
