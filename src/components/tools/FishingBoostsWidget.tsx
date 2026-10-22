import { FlowerAmount } from '../ResourceIcon';
import { SKILL_ICONS } from '../../lib/skills';
import {
  NO_FISHING_BOOSTS,
  castCost,
  expectedFishPerCast,
  fishUnitCost,
  skillRankValues,
  type FishTier,
  type FishingBoosts,
} from '../../lib/fishYield';
import type { SkillRank } from '../../lib/toolCosts';

type FlagKey = {
  [K in keyof FishingBoosts]: FishingBoosts[K] extends boolean ? K : never;
}[keyof FishingBoosts];

const ITEM_BOOSTS: { key: FlagKey; label: string; icon: string }[] = [
  { key: 'ancientRod', label: 'Ancient Rod — удочка бесплатна', icon: '/sprites/wearables/224.webp' },
  { key: 'artist', label: 'Artist — удочка −10%', icon: '/sprites/icons/artist.png' },
  { key: 'walrus', label: 'Walrus — +1 рыба за заброс', icon: '/sprites/sfts/walrus.webp' },
  { key: 'alba', label: 'Alba — 50% шанс +1 обычной рыбы', icon: '/sprites/sfts/alba.webp' },
  { key: 'sunflowerRod', label: 'Sunflower Rod — 10% шанс +1', icon: '/sprites/wearables/240.webp' },
  { key: 'trident', label: 'Trident — 20% шанс +1', icon: '/sprites/wearables/226.webp' },
];

const SEASONAL_BOOSTS: { key: FlagKey; label: string; icon: string }[] = [
  { key: 'pinkDolphin', label: 'Pink Dolphin — +1 весной', icon: '/sprites/fish/pink_dolphin.webp' },
  { key: 'jellyfish', label: 'Jellyfish — +1 летом', icon: '/sprites/fish/jellyfish.webp' },
  { key: 'poseidon', label: 'Poseidon — +1 осенью', icon: '/sprites/sfts/poseidon_fish.webp' },
  { key: 'superStar', label: 'Super Star — +1 зимой', icon: '/sprites/sfts/starfish_marvel.webp' },
];

type RankKey = 'reelDeal' | 'fishyChance' | 'fishyRoll' | 'fishyGamble';
const SKILL_BOOSTS: { key: RankKey; skill: string; hint: string; format: (v: number) => string }[] = [
  { key: 'reelDeal', skill: 'Reel Deal', hint: 'удочка', format: (v) => `×${v}` },
  { key: 'fishyChance', skill: 'Fishy Chance', hint: 'обычная рыба', format: (v) => `+${v}%` },
  { key: 'fishyRoll', skill: 'Fishy Roll', hint: 'продвинутая', format: (v) => `+${v}%` },
  { key: 'fishyGamble', skill: 'Fishy Gamble', hint: 'экспертная', format: (v) => `+${v}%` },
];

const TIER_LABELS: Record<FishTier, string> = { basic: 'обычная', advanced: 'продвинутая', expert: 'экспертная' };

export default function FishingBoostsWidget({
  boosts,
  onChange,
  prices,
  coinRate,
}: {
  boosts: FishingBoosts;
  onChange: (next: FishingBoosts) => void;
  prices: Record<string, number | null> | null;
  coinRate: number | null | undefined;
}) {
  const set = <K extends keyof FishingBoosts>(key: K, value: FishingBoosts[K]) => onChange({ ...boosts, [key]: value });
  // Сводка без сезонных марвелов: «одна рыба» не должна зависеть от выбранной строки сезона.
  const neutral = { ...boosts, pinkDolphin: false, jellyfish: false, poseidon: false, superStar: false };
  const cast = prices ? castCost(prices, coinRate, boosts) : null;
  const changed = JSON.stringify(boosts) !== JSON.stringify(NO_FISHING_BOOSTS);

  return (
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
      <div className="ref-food-boost-checks ref-fishing-boosts-seasonal">
        {SEASONAL_BOOSTS.map((o) => (
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
            {SKILL_ICONS[s.skill] && <img src={SKILL_ICONS[s.skill]} alt="" className="ref-marvel-icon ref-food-icon--sm" />}
            <span>
              {s.skill} <span className="ref-price-hint">({s.hint})</span>
            </span>
            <select
              value={boosts[s.key]}
              onChange={(e) => set(s.key, Number(e.target.value) as SkillRank)}
              className="ref-food-rank-select"
            >
              <option value={0}>выкл</option>
              {skillRankValues(s.skill).map((v, i) => (
                <option key={i} value={i + 1}>ранг {i + 1} · {s.format(v)}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="ref-fishing-boosts-sum">
        {cast == null ? (
          '…'
        ) : boosts.ancientRod ? (
          <>Заброс бесплатный (Ancient Rod) — рыба ничего не стоит.</>
        ) : (
          <>
            <span>
              Заброс удочки ≈ <FlowerAmount compact value={cast} />
            </span>
            {(['basic', 'advanced', 'expert'] as FishTier[]).map((t) => (
              <span key={t}>
                {TIER_LABELS[t]} рыба ≈ <FlowerAmount compact value={fishUnitCost(t, 'spring', prices!, coinRate, neutral)} />
                <span className="ref-price-hint"> ({expectedFishPerCast(t, 'spring', neutral).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} за заброс)</span>
              </span>
            ))}
          </>
        )}
        {changed && (
          <button type="button" className="gc-btn-secondary ref-fish-reset" onClick={() => onChange(NO_FISHING_BOOSTS)}>
            Сбросить бусты
          </button>
        )}
      </p>
    </div>
  );
}
