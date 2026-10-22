import { useState } from 'react';
import { CoinsIcon, FlowerAmount } from '../ResourceIcon';
import CoinRateNote from '../CoinRateNote';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { TOOLS, TOOL_PRICE_NAMES } from '../../lib/toolCosts';
import { WATER_TRAPS } from '../../lib/fishData.generated';
import {
  CHUM_ICONS,
  CHUM_PRICE_NAMES,
  NO_CRUSTACEAN_BOOSTS,
  POTS,
  POT_ICONS,
  TRAP_SPOTS_BY_ISLAND,
  crustaceanIcon,
  crustaceanRows,
  expectedYield,
  potCost,
  readyHours,
  type CrustaceanBoosts,
  type PotName,
} from '../../lib/crustaceans';

const PRICE_NAMES = [...new Set([...TOOL_PRICE_NAMES, ...CHUM_PRICE_NAMES])];

const BOOST_OPTIONS: { key: keyof CrustaceanBoosts; label: string; icon: string }[] = [
  { key: 'royalCrabPot', label: 'Royal Crab Pot — ловушка не тратится', icon: '/sprites/sfts/royal_crab_pot.webp' },
  { key: 'artist', label: 'Artist — ловушка −10%', icon: '/sprites/icons/artist.png' },
  { key: 'crabHouse', label: 'Crab House — +2 за сбор', icon: '/sprites/sfts/crab_house.webp' },
  { key: 'pistolShrimp', label: 'Pistol Shrimp — 20% шанс +1', icon: '/sprites/wearables/555.webp' },
  { key: 'speedTrap', label: 'Speed Trap — время ×0.8', icon: '/sprites/sfts/speed_trap.webp' },
  { key: 'crystalAltar', label: 'Crystal Altar — время ×0.95', icon: '/sprites/monuments/crystal_altar_3.webp' },
];

function formatHours(h: number): string {
  const hours = Math.floor(h);
  const minutes = Math.round((h - hours) * 60);
  return minutes > 0 ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

function PotCard({
  pot,
  prices,
  coinRate,
  boosts,
}: {
  pot: PotName;
  prices: Record<string, number | null> | null;
  coinRate: number | null | undefined;
  boosts: CrustaceanBoosts;
}) {
  const rows = prices ? crustaceanRows(pot, prices, coinRate, boosts) : null;
  const cost = prices ? potCost(pot, prices, coinRate, boosts) : null;
  const perCollect = expectedYield(boosts);
  return (
    <div className="ref-crust-card">
      <div className="ref-crust-head">
        <img src={POT_ICONS[pot]} alt="" className="ref-tool-icon" />
        <div>
          <strong>{pot}</strong>
          <span className="ref-tool-sub">
            {TOOLS.find((t) => t.name === pot)?.labelRu} · уровень {WATER_TRAPS[pot].level} · готова за {formatHours(readyHours(pot, boosts))}
            {cost && (
              <>
                {' '}· стоит{' '}
                {boosts.royalCrabPot ? 'бесплатно (Royal Crab Pot)' : <><CoinsIcon />{Math.round(cost.coins)} + ресурсы</>}
              </>
            )}
          </span>
        </div>
      </div>
      <ul className="ref-crust-list">
        {rows == null && <li className="ref-crust-row">…</li>}
        {rows?.map((r) => (
          <li className="ref-crust-row" key={`${r.crustacean}${r.chum?.name ?? ''}`}>
            <span className="ref-tool-name">
              <img src={crustaceanIcon(r.crustacean)} alt="" className="ref-crust-icon" />
              <span>{r.crustacean}</span>
            </span>
            <span className="ref-crust-chum">
              {r.chum ? (
                <>
                  {r.chum.amount}× <img src={CHUM_ICONS[r.chum.name]} alt="" className="gc-res-icon" /> {r.chum.name}
                </>
              ) : (
                <span className="ref-price-hint">без приманки</span>
              )}
            </span>
            <span className="ref-crust-cost">
              <span>
                {r.chum && r.chumFlower == null && <span className="ref-price-hint">от </span>}
                <FlowerAmount compact value={r.perUnit} />
              </span>
              {r.chum && r.chumFlower == null && (
                <span className="ref-price-hint ref-crust-missing" title="У этой приманки нет рыночной цены — без неё сумма неполная">
                  + {r.chum.amount}× {r.chum.name}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {perCollect > 1 && (
        <p className="ref-crust-foot ref-price-hint">
          Цена — за одно существо: установка делится на {perCollect.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} за сбор.
        </p>
      )}
    </div>
  );
}

export default function CrustaceanCosts() {
  const prices = useItemPrices(PRICE_NAMES);
  const { rate: coinRate } = useCoinRate();
  const [boosts, setBoosts] = useState<CrustaceanBoosts>(NO_CRUSTACEAN_BOOSTS);

  return (
    <div className="ref-crust-calc">
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          {BOOST_OPTIONS.map((o) => (
            <label className="ref-marvel-boost-check" key={o.key}>
              <input
                type="checkbox"
                checked={boosts[o.key]}
                onChange={(e) => setBoosts((prev) => ({ ...prev, [o.key]: e.target.checked }))}
              />
              <img src={o.icon} alt="" className="ref-marvel-icon ref-food-icon--sm" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="ref-crust-grid">
        {POTS.map((pot) => (
          <PotCard key={pot} pot={pot} prices={prices} coinRate={coinRate} boosts={boosts} />
        ))}
      </div>

      <p className="ref-section-desc">
        Мест под ловушки:{' '}
        {TRAP_SPOTS_BY_ISLAND.map((s) => `${s.island} — ${s.spots}`).join(', ')}.
      </p>
      <CoinRateNote rate={coinRate} />
    </div>
  );
}
