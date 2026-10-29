import { useState } from 'react';
import './FishCatalog.css';
import './FermentationRecipes.css';
import { FlowerAmount } from '../ResourceIcon';
import BoostPanel from '../BoostPanel';
import { Check, RankSelect } from './FoodBoostPanels';
import { useItemPrices } from '../../lib/useItemPrices';
import { SELLABLES } from '../../lib/coinRate';
import { useCoinRate } from '../../lib/useCoinRate';
import { rankValues } from '../../lib/composter';
import {
  BAIT_SECONDS,
  FERMENTATION_PRICE_NAMES,
  NO_AGING_BOOSTS,
  baitRows,
  formatDuration,
  recipeRows,
  type AgingBoosts,
  type BaitRow,
  type RecipeRow,
} from '../../lib/fermentation';
import { ASTROLABE_DOUBLE_CHANCE, BAIT_FAMILIES } from '../../lib/fermentationData.generated';

const ICONS: Record<string, string> = {
  ...Object.fromEntries(SELLABLES.map((s) => [s.name, s.icon])),
  Salt: '/sprites/resources/salt.webp',
  'Refined Salt': '/sprites/resources/refined_salt.webp',
  'Salt Lick': '/sprites/food/salt_lick.webp',
  'Honey Treat': '/sprites/food/honey_treat.webp',
  'Greenhouse Glow': '/sprites/icons/greenhouse_glow.webp',
  'Greenhouse Goodie': '/sprites/icons/greenhouse_goodie.webp',
  'Sproutroot Surprise': '/sprites/icons/sproutroot_surprise.webp',
  'Turbofruit Mix': '/sprites/icons/turbofruit_mix.webp',
  'Sprout Mix': '/sprites/composters/sprout_mix.png',
  'Rapid Root': '/sprites/composters/rapid_root.png',
  'Fruitful Blend': '/sprites/composters/fruitful_blend.png',
  'Capsule Bait': '/sprites/fish/bait/capsule_bait.webp',
  'Umbrella Bait': '/sprites/fish/bait/umbrella_bait.webp',
  'Crimson Baitfish': '/sprites/fish/bait/crimson_baitfish.webp',
  ...Object.fromEntries(
    ['Radish', 'Zucchini', 'Tomato', 'Broccoli', 'Onion', 'Pepper', 'Cabbage'].map((n) => [
      `Pickled ${n}`,
      `/sprites/pickled_crops/pickled_${n.toLowerCase()}.webp`,
    ]),
  ),
};

const slug = (s: string) => s.toLowerCase().replace(/ /g, '-');
const agedIcon = (fish: string) => `/sprites/fish/aged/generated/aged-${slug(fish)}.webp`;

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const src = ICONS[name];
  if (!src) return null;
  return <img src={src} alt="" className="ref-fish-icon" style={{ width: size, height: size }} />;
}

const num = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });

function Price({ value }: { value: number | null }) {
  return value == null ? <span className="ref-price-hint">нет цены</span> : <FlowerAmount compact value={value} />;
}

function RecipeCard({ row }: { row: RecipeRow }) {
  const { recipe, output, cost } = row;
  const boosted = row.output_ !== row.baseOutput;
  return (
    <li className="ref-ferm-row">
      <span className="ref-ferm-name">
        {ICONS[output] && <img src={ICONS[output]} alt="" />}
        <span>
          {recipe.name}
          <span className="ref-ferm-sub">
            {formatDuration(recipe.seconds)} · даёт {boosted ? `≈ ${num(row.output_)}` : num(row.baseOutput)}× {output}
          </span>
        </span>
      </span>
      <span className="ref-bait-ings">
        {cost.ingredients.map((i) => (
          <span className="ref-bait-ing" key={i.name} title={i.source === 'recipe' ? 'Цена — себестоимость по рецепту' : i.source === 'compost' ? 'Цена — по затратам на запуск компостера' : undefined}>
            <Icon name={i.name} />
            {num(i.amount)}× {i.name}
            {i.unit != null && (
              <span className="ref-ferm-ing-price">
                {' '}
                {i.source === 'recipe' || i.source === 'compost' ? '≈ ' : ''}
                <FlowerAmount compact value={i.unit} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="ref-ferm-price">
        <strong>
          <Price value={cost.total} />
        </strong>
        {row.unitCost != null && (
          <span className="ref-price-hint">
            1 шт ≈ <FlowerAmount compact value={row.unitCost} />
          </span>
        )}
      </span>
    </li>
  );
}

const TIER_LABEL: Record<string, string> = { basic: 'обычная', advanced: 'продвинутая', expert: 'эксперт' };

function BaitCard({ row }: { row: BaitRow }) {
  const fam = BAIT_FAMILIES.find((f) => f.bait === row.bait)!;
  return (
    <li className="ref-ferm-row">
      <span className="ref-ferm-name">
        <img src={ICONS[row.bait]} alt="" />
        <span>
          {row.bait} ({row.pickle.replace('Pickled ', '')})
          <span className="ref-ferm-sub">
            {formatDuration(BAIT_SECONDS)} · Aged: {num(row.outputAged)}× · Prime Aged: {num(row.outputPrime)}×
          </span>
        </span>
      </span>
      <span className="ref-bait-ings">
        <span className="ref-bait-ing">
          <img src={agedIcon(row.fish)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
          Aged / Prime Aged рыба ({TIER_LABEL[fam.fishTier]})
          <span className="ref-ferm-ing-price">
            {' '}
            самая дешёвая — {row.fish}
            {row.agedFishCost != null && (
              <>
                {' '}
                ≈ <FlowerAmount compact value={row.agedFishCost} />
              </>
            )}
          </span>
        </span>
        <span className="ref-bait-ing">
          <Icon name={row.pickle} />1× {row.pickle}
          {row.pickleCost != null && (
            <span className="ref-ferm-ing-price">
              {' '}
              ≈ <FlowerAmount compact value={row.pickleCost} />
            </span>
          )}
        </span>
      </span>
      <span className="ref-ferm-price">
        <strong>
          <Price value={row.jobTotal} />
        </strong>
        {row.unitAged != null && (
          <span className="ref-price-hint">
            1 шт ≈ <FlowerAmount compact value={row.unitAged} /> (Aged)
            {row.unitPrime != null && (
              <>
                {' · '}
                <FlowerAmount compact value={row.unitPrime} /> (Prime)
              </>
            )}
          </span>
        )}
      </span>
    </li>
  );
}

const rankHint = (skill: string, fmt: (v: number) => string) =>
  rankValues(skill)
    .map((v) => fmt(v))
    .join(' / ');

export default function FermentationRecipes() {
  const prices = useItemPrices(FERMENTATION_PRICE_NAMES);
  const { rate } = useCoinRate();
  const [boosts, setBoosts] = useState<AgingBoosts>(NO_AGING_BOOSTS);
  const set = <K extends keyof AgingBoosts>(key: K, value: AgingBoosts[K]) => setBoosts((b) => ({ ...b, [key]: value }));
  const changed = JSON.stringify(boosts) !== JSON.stringify(NO_AGING_BOOSTS);

  const p = prices != null && rate !== undefined ? prices : null;
  const ferm = recipeRows('fermentation', p, rate, boosts);
  const spice = recipeRows('spice', p, rate, boosts);
  const baits = baitRows(p, rate, boosts);
  const groups: { title: string; rows: RecipeRow[] }[] = [
    { title: 'Маринады', rows: ferm.filter((r) => r.recipe.name.startsWith('Pickled')) },
    { title: 'Теплица: Greenhouse Glow и Goodie', rows: ferm.filter((r) => r.recipe.name.startsWith('Greenhouse')) },
    { title: 'Смеси для грядок', rows: ferm.filter((r) => r.output === 'Sproutroot Surprise' || r.output === 'Turbofruit Mix') },
    { title: 'Соль из отходов', rows: ferm.filter((r) => r.recipe.name.startsWith('Salt from')) },
  ];

  return (
    <div className="ref-ferm">
      <BoostPanel title="Бусты сарая выдержки">
        <div className="ref-marvel-boost-widget ref-fishing-boosts">
          <div className="ref-food-boost-checks">
            <Check
              label={`Astrolabe — ${ASTROLABE_DOUBLE_CHANCE}% шанс удвоить выход`}
              icon="Astrolabe"
              checked={boosts.astrolabe}
              onChange={(v) => set('astrolabe', v)}
            />
            <Check
              label="Salt Bottle Onesie — +1 на стойке специй"
              icon="Salt Bottle Onesie"
              checked={boosts.saltBottleOnesie}
              onChange={(v) => set('saltBottleOnesie', v)}
            />
          </div>
          <div className="ref-food-boost-selects">
            <RankSelect
              label={`Ager — выход и расход ×${rankHint('Ager', (v) => String(v))}`}
              icon="Ager"
              value={boosts.ager}
              onChange={(v) => set('ager', v as AgingBoosts['ager'])}
            />
            <RankSelect
              label={`Refiner — шанс +1 Refined Salt ${rankHint('Refiner', (v) => `${v}%`)}`}
              icon="Refiner"
              value={boosts.refiner}
              onChange={(v) => set('refiner', v as AgingBoosts['refiner'])}
            />
            <RankSelect
              label={`Bacalhau — к наживке +${rankHint('Bacalhau', (v) => String(v))}`}
              icon="Bacalhau"
              value={boosts.bacalhau}
              onChange={(v) => set('bacalhau', v as AgingBoosts['bacalhau'])}
            />
          </div>
          {changed && (
            <p className="ref-fishing-boosts-sum">
              <button type="button" className="gc-btn-secondary ref-fish-reset" onClick={() => setBoosts(NO_AGING_BOOSTS)}>
                Сбросить бусты
              </button>
            </p>
          )}
        </div>
      </BoostPanel>

      {groups.map((g) => (
        <section key={g.title}>
          <h3>{g.title}</h3>
          <ul className="ref-ferm-list">
            {g.rows.map((r) => (
              <RecipeCard key={r.recipe.name} row={r} />
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h3>Наживки из выдержанной рыбы</h3>
        <ul className="ref-ferm-list">
          {baits.map((r) => (
            <BaitCard key={`${r.bait}-${r.pickle}`} row={r} />
          ))}
        </ul>
      </section>

      <section>
        <h3>Стойка специй</h3>
        <ul className="ref-ferm-list">
          {spice.map((r) => (
            <RecipeCard key={r.recipe.name} row={r} />
          ))}
        </ul>
      </section>
    </div>
  );
}
