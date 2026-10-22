import { useState } from 'react';
import './FishCatalog.css';
import './ComposterCosts.css';
import { FlowerAmount } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { SELLABLES } from '../../lib/coinRate';
import { SEASON_NAMES } from '../../lib/baitCosts';
import { SEASON_INFO } from '../../lib/fishCatalog';
import { COMPOSTERS } from '../../lib/composterData.generated';
import {
  COMPOSTER_ICONS,
  COMPOSTER_NAMES,
  COMPOSTER_PRICE_NAMES,
  COMPOST_EFFECTS,
  COMPOST_ICONS,
  NO_COMPOSTER_BOOSTS,
  WORM_EFFECTS,
  WORM_ICONS,
  buildingCost,
  compostAmount,
  composterHours,
  rankValues,
  runCost,
  speedUp,
  wormStats,
  type ComposterBoosts,
  type ComposterName,
  type RunCost,
} from '../../lib/composter';
import type { SkillRank } from '../../lib/toolCosts';

type FlagKey = { [K in keyof ComposterBoosts]: ComposterBoosts[K] extends boolean ? K : never }[keyof ComposterBoosts];
type RankKey = { [K in keyof ComposterBoosts]: ComposterBoosts[K] extends boolean ? never : K }[keyof ComposterBoosts];

const ITEM_BOOSTS: { key: FlagKey; label: string; icon: string }[] = [
  { key: 'turdTopper', label: 'Turd Topper — +1 компост', icon: '/sprites/wearables/476.webp' },
  { key: 'bucketOWorms', label: "Bucket O' Worms — +1 червь", icon: '/sprites/wearables/228.webp' },
  { key: 'sawFish', label: 'Saw Fish — +1 червь', icon: '/sprites/wearables/238.webp' },
  { key: 'deepSeaSlug', label: 'Deep Sea Slug — +1 червь', icon: '/sprites/fish/deep_sea_slug.webp' },
  { key: 'soilKrabby', label: 'Soil Krabby — время ×0.9', icon: '/sprites/sfts/soil_krabby.webp' },
];

const SKILL_BOOSTS: { key: RankKey; skill: string; hint: string; format: (rank: number) => string }[] = [
  { key: 'efficientBin', skill: 'Efficient Bin', hint: 'Compost Bin', format: (r) => `+${rankValues('Efficient Bin')[r - 1]}` },
  { key: 'turboCharged', skill: 'Turbo Charged', hint: 'Turbo Composter', format: (r) => `+${rankValues('Turbo Charged')[r - 1]}` },
  { key: 'premiumWorms', skill: 'Premium Worms', hint: 'Premium Composter', format: (r) => `+${rankValues('Premium Worms')[r - 1]}` },
  {
    key: 'compostingRevamp',
    skill: 'Composting Revamp',
    hint: 'все',
    format: (r) => `+${rankValues('Composting Revamp', 'buff')[r - 1]} / −${rankValues('Composting Revamp', 'debuff')[r - 1]} червей`,
  },
  { key: 'wormyTreat', skill: 'Wormy Treat', hint: 'черви', format: (r) => `+${rankValues('Wormy Treat')[r - 1]}` },
  { key: 'compostingOverhaul', skill: 'Composting Overhaul', hint: 'черви', format: (r) => `+${rankValues('Composting Overhaul')[r - 1]}` },
  { key: 'swiftDecomposer', skill: 'Swift Decomposer', hint: 'время', format: (r) => `время ×${rankValues('Swift Decomposer')[r - 1]}` },
  { key: 'featheryBusiness', skill: 'Feathery Business', hint: 'ускорение', format: (r) => `перья ×${rankValues('Feathery Business')[r - 1]}` },
  {
    key: 'compostingBonanza',
    skill: 'Composting Bonanza',
    hint: 'ускорение',
    format: (r) => `×2 расход, +${rankValues('Composting Bonanza')[r - 1] / 3_600_000} ч`,
  },
];

const ICONS: Record<string, string> = {
  ...Object.fromEntries(SELLABLES.map((s) => [s.name, s.icon])),
  Egg: '/sprites/resources/animals/egg.png',
  Feather: '/sprites/resources/animals/feather.webp',
  Wood: '/sprites/resources/wood.png',
  Stone: '/sprites/resources/stone.png',
  Gold: '/sprites/resources/gold_ore.png',
};

function ItemChip({ name, amount }: { name: string; amount: number }) {
  return (
    <span className="ref-bait-ing">
      {ICONS[name] && <img src={ICONS[name]} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />}
      {amount}× {name}
    </span>
  );
}

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return hours > 0 ? (minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`) : `${minutes} мин`;
}

function SeasonRow({ cost }: { cost: RunCost }) {
  const info = SEASON_INFO[cost.season];
  return (
    <li className="ref-bait-season-row ref-comp-row">
      <span className="ref-bait-season" title={info.label}>
        {info.emoji} <span className="ref-bait-season-name">{info.label}</span>
      </span>
      <span className="ref-bait-ings">
        {cost.ingredients.map((i) => <ItemChip key={i.name} name={i.name} amount={i.amount} />)}
      </span>
      <span className="ref-comp-cost">
        {cost.total == null ? (
          <span className="ref-price-hint">нет цены</span>
        ) : (
          <>
            <span className="ref-comp-total">
              <FlowerAmount compact value={cost.total} />
            </span>
            <span className="ref-price-hint ref-comp-split" title="Запуск даёт и компост, и червей — цена делится условно: либо всё на компост, либо всё на червя">
              1 компост ≈ <FlowerAmount compact value={cost.perCompost ?? 0} />
              {cost.perWorm != null && <> · 1 червь ≈ <FlowerAmount compact value={cost.perWorm} /></>}
            </span>
          </>
        )}
      </span>
    </li>
  );
}

function ComposterCard({
  name,
  prices,
  boosts,
}: {
  name: ComposterName;
  prices: Record<string, number | null> | null;
  boosts: ComposterBoosts;
}) {
  const record = COMPOSTERS[name];
  const worms = wormStats(name, boosts);
  const compost = compostAmount(name, boosts);
  const speed = speedUp(name, boosts);
  const building = prices ? buildingCost(name, prices) : null;
  const speedPrice = prices && prices[speed.item] != null ? prices[speed.item]! * speed.amount : null;
  return (
    <div className="ref-bait-card ref-comp-card">
      <div className="ref-comp-head">
        <img src={COMPOSTER_ICONS[name]} alt="" className="ref-comp-icon" />
        <div>
          <strong className="ref-comp-name">{name}</strong>
          <span className="ref-tool-sub">
            {building && (
              <>
                уровень {building.level} · постройка {building.ingredients.map((i) => `${i.amount} ${i.name}`).join(' + ')}
                {building.flower != null && <> (≈ <FlowerAmount compact value={building.flower} />)</>}, {building.hours} ч
              </>
            )}
          </span>
        </div>
      </div>
      <ul className="ref-comp-facts">
        <li>
          Даёт за запуск: <strong>{compost}×</strong>{' '}
          <img src={COMPOST_ICONS[record.produce]} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} /> {record.produce}{' '}
          <span className="ref-price-hint">({COMPOST_EFFECTS[record.produce]})</span> и{' '}
          <strong>{worms.min === worms.max ? worms.min : `${worms.min}–${worms.max}`}×</strong>{' '}
          <img src={WORM_ICONS[record.worm]} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} /> {record.worm}{' '}
          <span className="ref-price-hint">
            (в среднем {worms.avg.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}; {WORM_EFFECTS[record.worm]})
          </span>
        </li>
        <li>
          Готов за <strong>{formatHours(composterHours(name, boosts))}</strong>. Ускорение: {speed.amount.toLocaleString('ru-RU')}{' '}
          {speed.item === 'Egg' ? 'яиц' : 'перьев'}
          {speedPrice != null && <> (≈ <FlowerAmount compact value={speedPrice} />)</>} срезает{' '}
          {speed.hours.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч.
        </li>
      </ul>
      <ul className="ref-bait-season-list">
        {SEASON_NAMES.map((s) =>
          prices ? (
            <SeasonRow key={s} cost={runCost(name, s, prices, boosts)} />
          ) : (
            <li className="ref-bait-season-row" key={s}>…</li>
          ),
        )}
      </ul>
    </div>
  );
}

export default function ComposterCosts() {
  const prices = useItemPrices(COMPOSTER_PRICE_NAMES);
  const [boosts, setBoosts] = useState<ComposterBoosts>(NO_COMPOSTER_BOOSTS);
  const set = <K extends keyof ComposterBoosts>(key: K, value: ComposterBoosts[K]) => setBoosts((b) => ({ ...b, [key]: value }));
  const changed = JSON.stringify(boosts) !== JSON.stringify(NO_COMPOSTER_BOOSTS);

  return (
    <div className="ref-comp-calc">
      <div className="ref-marvel-boost-widget ref-fishing-boosts">
        <div className="ref-food-boost-checks">
          {ITEM_BOOSTS.map((o) => (
            <label className="ref-marvel-boost-check" key={o.key}>
              <input type="checkbox" checked={boosts[o.key]} onChange={(e) => set(o.key, e.target.checked)} />
              <img src={o.icon} alt="" className="ref-marvel-icon ref-food-icon--sm" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        <div className="ref-food-boost-selects">
          {SKILL_BOOSTS.map((s) => (
            <label className="ref-marvel-boost-check" key={s.key}>
              <span>
                {s.skill} <span className="ref-price-hint">({s.hint})</span>
              </span>
              <select
                value={boosts[s.key]}
                onChange={(e) => set(s.key, Number(e.target.value) as SkillRank)}
                className="ref-food-rank-select"
              >
                <option value={0}>выкл</option>
                {[1, 2, 3].map((r) => (
                  <option key={r} value={r}>ранг {r} · {s.format(r)}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {changed && (
          <p className="ref-fishing-boosts-sum">
            <button type="button" className="gc-btn-secondary ref-fish-reset" onClick={() => setBoosts(NO_COMPOSTER_BOOSTS)}>
              Сбросить бусты
            </button>
          </p>
        )}
      </div>

      <div className="ref-comp-list">
        {COMPOSTER_NAMES.map((n) => (
          <ComposterCard key={n} name={n} prices={prices} boosts={boosts} />
        ))}
      </div>
    </div>
  );
}
