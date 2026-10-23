import { useCallback, useEffect, useMemo, useState } from 'react';
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
  flowerAnchor,
  flowerByAnchor,
  flowerCosts,
  flowerIcon,
  flowerTimes,
  flowerSkillValues,
  growDays,
  flowerRow,
  ingredientIcon,
  seedCoins,
  seedFlowerPrice,
  seedIcon,
  seedOfFlower,
  type FlowerBoosts,
  type FlowerRow,
  type FlowerSort,
  type RecipeOption,
} from '../../lib/flowers';

function Option({ option, cheap, fast, onJump }: { option: RecipeOption; cheap: boolean; fast: boolean; onJump: (flower: string) => void }) {
  const extraWait = option.isFlower && option.wait != null && Number.isFinite(option.wait) ? option.wait : null;
  const cls = [
    'ref-bait-ing ref-flower-opt',
    cheap || fast ? 'ref-flower-opt--best' : '',
    option.total == null ? 'ref-flower-opt--nop' : '',
    option.worthwhile === false ? 'ref-flower-opt--weak' : '',
  ].filter(Boolean).join(' ');
  const title = [
    cheap ? 'Самый дешёвый рецепт' : '',
    fast ? 'Самый быстрый рецепт' : '',
    option.worthwhile === false ? 'Есть рецепт не дороже и не дольше' : '',
    option.isFlower ? 'Цветы не продаются на маркете — цена по себестоимости выращивания' : '',
    option.total == null ? 'Нет цены' : '',
  ].filter(Boolean).join('. ');
  return (
    <span className={cls} title={title || undefined}>
      {cheap && <span className="ref-flower-mark" aria-label="самый дешёвый">💰</span>}
      {fast && <span className="ref-flower-mark" aria-label="самый быстрый">⚡</span>}
      {option.isFlower ? (
        <a
          href={`#${flowerAnchor(option.name)}`}
          className="ref-flower-link"
          title={`Перейти к рецепту: ${option.name}`}
          onClick={(e) => {
            e.preventDefault();
            onJump(option.name);
          }}
        >
          <img src={ingredientIcon(option.name)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
          {option.name}
        </a>
      ) : (
        <>
          <img src={ingredientIcon(option.name)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
          {option.amount > 1 ? `${option.amount}× ` : ''}{option.name}
        </>
      )}
      {option.total != null && (
        <span className="ref-price-hint"> {option.isFlower && '≈'}<FlowerAmount compact value={option.total} /></span>
      )}
      {extraWait != null && <span className="ref-price-hint ref-flower-wait"> +{formatDays(extraWait)}</span>}
    </span>
  );
}

function Row({ row, onJump }: { row: FlowerRow; onJump: (flower: string) => void }) {
  const { cheapest, fastest } = row;
  const same = cheapest === fastest;
  return (
    <li className="ref-bait-season-row ref-flower-row" id={flowerAnchor(row.flower)}>
      <span className="ref-flower-name">
        <img src={flowerIcon(row.flower)} alt="" className="ref-fish-icon" style={{ width: 26, height: 26 }} />
        <span>{row.flower}</span>
      </span>
      <span className="ref-bait-ings">
        {row.options.map((o) => <Option key={o.name} option={o} cheap={o === cheapest} fast={o === fastest} onJump={onJump} />)}
      </span>
      <span className="ref-comp-cost">
        {cheapest?.cost == null ? (
          <span className="ref-price-hint">нет цены</span>
        ) : (
          <span className="ref-comp-total" title="Самый дешёвый рецепт: себестоимость цветка и время всей цепочки">
            {same ? '💰⚡' : '💰'} ≈ <FlowerAmount compact value={cheapest.cost} />
            {cheapest.days != null && <span className="ref-flower-time"> · {formatDays(cheapest.days)}</span>}
          </span>
        )}
        {!same && fastest && fastest.days != null && (
          <span className="ref-price-hint ref-comp-split" title="Самый быстрый рецепт: время всей цепочки и себестоимость цветка">
            ⚡ {formatDays(fastest.days)}
            {fastest.cost != null && <> · ≈ <FlowerAmount compact value={fastest.cost} /></>}
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

const SORTS: { key: FlowerSort; label: string; hint: string }[] = [
  { key: 'fast', label: 'Сначала быстрые', hint: 'Рецепты в строке — от быстрого к долгому' },
  { key: 'cheap', label: 'Сначала дешёвые', hint: 'Рецепты в строке — от дешёвого к дорогому' },
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
  const [sort, setSort] = useState<FlowerSort>('fast');
  // Свёрнутые карточки семян (по умолчанию все раскрыты).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const costs = useMemo(() => (prices ? flowerCosts(prices, rate, boosts) : null), [prices, rate, boosts]);

  // Переход к рецепту цветка: раскрываем карточку его семени, прокручиваем и подсвечиваем строку.
  const jumpTo = useCallback((flower: string) => {
    const seed = seedOfFlower(flower);
    if (!seed) return;
    setCollapsed((prev) => {
      if (!prev.has(seed)) return prev;
      const next = new Set(prev);
      next.delete(seed);
      return next;
    });
    window.setTimeout(() => {
      const el = document.getElementById(flowerAnchor(flower));
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('ref-flower-row--flash');
      void el.offsetWidth; // перезапуск анимации при повторном клике
      el.classList.add('ref-flower-row--flash');
      window.setTimeout(() => el.classList.remove('ref-flower-row--flash'), 2200);
      try { history.replaceState(null, '', `#${flowerAnchor(flower)}`); } catch { /* адрес не обязателен */ }
    }, 60);
  }, []);

  // Прямая ссылка вида #flower-red-pansy: открыть цветок, когда строки уже отрисованы.
  const ready = !!(prices && costs);
  useEffect(() => {
    if (!ready) return;
    const hash = window.location.hash.replace(/^#/, '');
    const flower = hash.startsWith('flower-') ? flowerByAnchor(hash) : undefined;
    if (flower) jumpTo(flower);
  }, [ready, jumpTo]);
  const times = useMemo(() => flowerTimes(boosts), [boosts]);
  return (
    <div className="ref-flower-calc">
      <BoostsPanel boosts={boosts} onChange={setBoosts} />
      <div className="ref-flower-sort" role="group" aria-label="Порядок рецептов">
        <span className="ref-price-hint">Порядок рецептов:</span>
        {SORTS.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`gc-btn-secondary ref-flower-sort-btn${sort === o.key ? ' ref-flower-sort-btn--on' : ''}`}
            aria-pressed={sort === o.key}
            onClick={() => setSort(o.key)}
            title={o.hint}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          className="gc-btn-secondary ref-flower-sort-btn ref-flower-collapse-all"
          onClick={() => setCollapsed(collapsed.size === SEED_ORDER.length ? new Set() : new Set(SEED_ORDER))}
        >
          {collapsed.size === SEED_ORDER.length ? 'Развернуть все' : 'Свернуть все'}
        </button>
      </div>
      <div className="ref-comp-list">
        {SEED_ORDER.map((seed) => {
          const info = FLOWER_SEEDS[seed];
          const seedPrice = seedFlowerPrice(seed, rate, boosts);
          const season = info.season ? SEASON_INFO[info.season] : null;
          return (
            <details
              className="ref-bait-card ref-comp-card ref-flower-seed"
              key={seed}
              open={!collapsed.has(seed)}
              onToggle={(e) => {
                const isOpen = e.currentTarget.open;
                setCollapsed((prev) => {
                  if (isOpen !== prev.has(seed)) return prev;
                  const next = new Set(prev);
                  if (isOpen) next.delete(seed); else next.add(seed);
                  return next;
                });
              }}
            >
              <summary className="ref-comp-head ref-flower-seed-head">
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
              </summary>
              <ul className="ref-bait-season-list">
                {prices && costs
                  ? info.flowers.map((f) => <Row key={f} row={flowerRow(f, prices, { costs, times, coinRate: rate, boosts, sort })} onJump={jumpTo} />)
                  : <li className="ref-bait-season-row">…</li>}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
