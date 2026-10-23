import { useMemo, useState } from 'react';
import './FishCatalog.css';
import './FlowerRecipes.css';
import { FlowerAmount, CoinsIcon } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { SEASON_INFO } from '../../lib/fishCatalog';
import { FLOWER_SEEDS } from '../../lib/flowerData.generated';
import { SKILL_ICONS } from '../../lib/skills';
import type { SkillRank } from '../../lib/toolCosts';
import BoostPanel from '../BoostPanel';
import {
  FLOWER_PRICE_NAMES,
  SEED_ORDER,
  NO_FLOWER_BOOSTS,
  expectedFlowers,
  flowerCosts,
  flowerIcon,
  flowerSkillValues,
  growDays,
  flowerRow,
  ingredientIcon,
  seedCoins,
  seedFlowerPrice,
  seedIcon,
  type FlowerBoosts,
  type FlowerRow,
  type RecipeOption,
} from '../../lib/flowers';

function Option({ option, best }: { option: RecipeOption; best: boolean }) {
  return (
    <span
      className={`ref-bait-ing ref-flower-opt${best ? ' ref-flower-opt--best' : ''}${option.total == null ? ' ref-flower-opt--nop' : ''}`}
      title={option.total == null ? 'Нет цены' : option.isFlower ? 'Цветы не продаются на маркете — цена по себестоимости выращивания' : undefined}
    >
      <img src={ingredientIcon(option.name)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
      {option.amount > 1 ? `${option.amount}× ` : ''}{option.name}
      {option.total != null && (
        <span className="ref-price-hint"> {option.isFlower && '≈'}<FlowerAmount compact value={option.total} /></span>
      )}
    </span>
  );
}

function Row({ row }: { row: FlowerRow }) {
  return (
    <li className="ref-bait-season-row ref-flower-row">
      <span className="ref-flower-name">
        <img src={flowerIcon(row.flower)} alt="" className="ref-fish-icon" style={{ width: 26, height: 26 }} />
        <span>{row.flower}</span>
      </span>
      <span className="ref-bait-ings">
        {row.options.map((o) => <Option key={o.name} option={o} best={o === row.cheapest} />)}
      </span>
      <span className="ref-comp-cost">
        {row.cost == null ? (
          <span className="ref-price-hint">нет цены</span>
        ) : (
          <span className="ref-comp-total" title="Себестоимость цветка: (семя по курсу монет + самый дешёвый предмет скрещивания) ÷ ожидаемый выход">
            ≈ <FlowerAmount compact value={row.cost} />
          </span>
        )}
      </span>
    </li>
  );
}

type FlagKey = { [K in keyof FlowerBoosts]: FlowerBoosts[K] extends boolean ? K : never }[keyof FlowerBoosts];
type RankKey = { [K in keyof FlowerBoosts]: FlowerBoosts[K] extends boolean ? never : K }[keyof FlowerBoosts];

const YIELD_BOOSTS: { key: FlagKey; label: string; icon: string }[] = [
  { key: 'butterfly', label: 'Butterfly — 20% шанс +1', icon: '/sprites/sfts/butterfly.webp' },
  { key: 'hummingBird', label: 'Humming Bird — 20% шанс +1', icon: '/sprites/sfts/hummingbird.webp' },
  { key: 'chicory', label: 'Chicory — 10% шанс +1', icon: '/sprites/sfts/chicory.webp' },
  { key: 'desertRose', label: 'Desert Rose — 10% шанс +1', icon: '/sprites/sfts/desert_rose.webp' },
  { key: 'saltCrystalFlower', label: 'Salt Crystal Flower — 5% шанс +1', icon: '/sprites/sfts/salt_crystal_flower.webp' },
  { key: 'mothShrine', label: 'Moth Shrine — 20% шанс +1, время ×0.75', icon: '/sprites/sfts/shrines/moth_shrine.webp' },
  { key: 'legendaryShrine', label: 'Legendary Shrine — +1 цветок', icon: '/sprites/sfts/shrines/legendary_shrine.webp' },
];
const COST_BOOSTS: { key: FlagKey; label: string; icon: string }[] = [
  { key: 'kuebiko', label: 'Kuebiko — семена бесплатны', icon: '/sprites/sfts/kuebiko.gif' },
  { key: 'hungryCaterpillar', label: 'Hungry Caterpillar — семена цветов бесплатны', icon: '/sprites/sfts/hungry_caterpillar.webp' },
  { key: 'artist', label: 'Artist — семена ×0.9', icon: '/sprites/icons/artist.png' },
  { key: 'flowerFox', label: 'Flower Fox — время ×0.9', icon: '/sprites/sfts/flower_fox.webp' },
];
const SKILL_BOOSTS: { key: RankKey; skill: string; hint: string; format: (rank: number) => string }[] = [
  { key: 'petalledPerk', skill: 'Petalled Perk', hint: 'шанс +1', format: (r) => `${flowerSkillValues('Petalled Perk')[r - 1]}%` },
  { key: 'flowerSale', skill: 'Flower Sale', hint: 'цена семян', format: (r) => `×${flowerSkillValues('Flower Sale')[r - 1]}` },
  { key: 'bloomingBoost', skill: 'Blooming Boost', hint: 'время', format: (r) => `×${flowerSkillValues('Blooming Boost')[r - 1]}` },
  { key: 'flowerPower', skill: 'Flower Power', hint: 'время', format: (r) => `×${flowerSkillValues('Flower Power')[r - 1]}` },
  { key: 'floweryAbode', skill: 'Flowery Abode', hint: 'штраф ко времени', format: (r) => `×${flowerSkillValues('Flowery Abode', 'growth')[r - 1]}` },
];

function formatDays(d: number): string {
  const hours = d * 24;
  const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return hours < 48 ? `${fmt(hours)} ч` : `${fmt(d)} дн.`;
}

function BoostsPanel({ boosts, onChange }: { boosts: FlowerBoosts; onChange: (b: FlowerBoosts) => void }) {
  const set = <K extends keyof FlowerBoosts>(key: K, value: FlowerBoosts[K]) => onChange({ ...boosts, [key]: value });
  const changed = JSON.stringify(boosts) !== JSON.stringify(NO_FLOWER_BOOSTS);
  const checks = (list: { key: FlagKey; label: string; icon: string }[]) => (
    <div className="ref-food-boost-checks">
      {list.map((o) => (
        <label className="ref-marvel-boost-check" key={o.key}>
          <input type="checkbox" checked={boosts[o.key]} onChange={(e) => set(o.key, e.target.checked)} />
          <img src={o.icon} alt="" className="ref-marvel-icon ref-food-icon--sm" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
  return (
    <BoostPanel title="Бусты цветов">
      <div className="ref-marvel-boost-widget ref-fishing-boosts">
        {checks(YIELD_BOOSTS)}
        {checks(COST_BOOSTS)}
        <div className="ref-food-boost-selects">
          {SKILL_BOOSTS.map((o) => (
            <label className="ref-marvel-boost-check" key={o.key}>
              {SKILL_ICONS[o.skill]
                ? <img src={SKILL_ICONS[o.skill]} alt="" className="ref-marvel-icon ref-food-icon--sm" />
                : <span className="ref-marvel-icon ref-food-icon--sm" aria-hidden="true">🌸</span>}
              <span>
                {o.skill} <span className="ref-price-hint">({o.hint})</span>
              </span>
              <select
                value={boosts[o.key]}
                onChange={(e) => set(o.key, Number(e.target.value) as SkillRank)}
                className="ref-food-rank-select"
              >
                <option value={0}>выкл</option>
                {[1, 2, 3].map((r) => (
                  <option key={r} value={r}>ранг {r} · {o.format(r)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="ref-fishing-boosts-sum">
          Ожидаемый выход: <strong>{expectedFlowers(boosts).toLocaleString('ru-RU', { maximumFractionDigits: 3 })}</strong> цветка за
          посадку
          {changed && (
            <>
              {' '}
              <button type="button" className="gc-btn-secondary ref-fish-reset" onClick={() => onChange(NO_FLOWER_BOOSTS)}>
                Сбросить бусты
              </button>
            </>
          )}
        </p>
      </div>
    </BoostPanel>
  );
}

export default function FlowerRecipes() {
  const prices = useItemPrices(FLOWER_PRICE_NAMES);
  const { rate } = useCoinRate();
  const [boosts, setBoosts] = useState<FlowerBoosts>(NO_FLOWER_BOOSTS);
  const costs = useMemo(() => (prices ? flowerCosts(prices, rate, boosts) : null), [prices, rate, boosts]);
  return (
    <div className="ref-flower-calc">
      <BoostsPanel boosts={boosts} onChange={setBoosts} />
      <div className="ref-comp-list">
        {SEED_ORDER.map((seed) => {
          const info = FLOWER_SEEDS[seed];
          const seedPrice = seedFlowerPrice(seed, rate, boosts);
          const season = info.season ? SEASON_INFO[info.season] : null;
          return (
            <div className="ref-bait-card ref-comp-card" key={seed}>
              <div className="ref-comp-head">
                <img src={seedIcon(seed)} alt="" className="ref-comp-icon" />
                <div>
                  <strong className="ref-comp-name">{seed}</strong>
                  <span className="ref-tool-sub">
                    уровень {info.level} · растёт {formatDays(growDays(seed, boosts))} ·{' '}
                    семя {seedCoins(seed, boosts).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} <CoinsIcon />
                    {seedPrice != null && <> (≈ <FlowerAmount compact value={seedPrice} />)</>}
                    {season && <> · семя продаётся только в сезон: {season.emoji} {season.label}</>}
                  </span>
                </div>
              </div>
              <ul className="ref-bait-season-list">
                {prices && costs
                  ? info.flowers.map((f) => <Row key={f} row={flowerRow(f, prices, costs)} />)
                  : <li className="ref-bait-season-row">…</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
