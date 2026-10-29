import { useEffect, useMemo, useState } from 'react';
import '../SortableTable.css';
import './FishCatalog.css';
import './AnimalsCalculator.css';
import { FlowerAmount } from '../ResourceIcon';
import BoostPanel from '../BoostPanel';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { FERMENTATION_PRICE_NAMES, NO_AGING_BOOSTS, createPricer } from '../../lib/fermentation';
import { DEFAULT_GEM_PACK, FLOWER_PAYMENT_DISCOUNT, GEM_PACKS, gemUsd } from '../../lib/gemPacks';
import {
  ANIMALS,
  ANIMAL_LABEL,
  ANIMAL_PRICE_NAMES,
  BUD_AURA,
  DIET_SKILLS,
  ITEM_BOOSTS,
  MAX_LEVEL,
  MUD_PER_APPLICATION,
  NO_ANIMAL_BOOSTS,
  averageLoveXp,
  buffHarvests,
  canEatOmnifeed,
  cycleRow,
  pigBristles,
  skillRanks,
  type AnimalBoosts,
  type AnimalType,
  type BudAura,
  type CycleRow,
  type FeedBuff,
  type ItemBoost,
  type Rank,
  type SkillName,
} from '../../lib/animals';
import {
  ANIMAL_BUILDING,
  ANIMAL_COINS,
  ANIMAL_ICONS,
  LOVE_ITEM_XP,
  REQUIRED_FOOD_QTY,
} from '../../lib/animalData.generated';

const ICONS = ANIMAL_ICONS as unknown as Record<string, string>;

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const src = ICONS[name];
  if (!src) return null;
  return <img src={src} alt="" className="ref-fish-icon" style={{ width: size, height: size }} />;
}

const num = (n: number, digits = 2) => n.toLocaleString('ru-RU', { maximumFractionDigits: digits });
const hours = (h: number) => {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min ? `${whole} ч ${min} мин` : `${whole} ч`;
};
const fmtRanks = (vals: number[], prefix = '') => vals.map((v) => `${prefix}${num(v, 3)}`).join(' / ');

function Price({ value, loading }: { value: number | null; loading?: boolean }) {
  if (loading) return <span className="ref-price-hint">…</span>;
  return value == null ? <span className="ref-price-hint">нет цены</span> : <FlowerAmount compact value={value} />;
}

/** Подпись буста-предмета: что именно он делает. */
function itemEffect(b: ItemBoost): string {
  switch (b.kind) {
    case 'produce':
      return b.name === 'Bale'
        ? '+0,1 яиц (с Bale Economy — ещё шерсть и молоко)'
        : `+${num(b.value)} ${b.resource ?? 'ко всей продукции'}`;
    case 'feed':
      return b.temporary ? `корм ×${num(b.value)}, сон ×0,75 (пока стоит)` : `корм ×${num(b.value)}`;
    case 'free':
      return 'кормление бесплатно';
    case 'xp':
      return `опыт за корм ×${num(b.value)}`;
    case 'love':
      return `+${b.value} опыта за поглаживание`;
    case 'sleep':
      return `сон ×${num(b.value, 3)}`;
    case 'sleepHours':
      return `сон −${b.value} ч`;
    case 'buffDuration':
      return 'лакомства и грязь держатся ×2';
  }
}

interface SkillLine {
  name: SkillName;
  label: string;
}

function skillLines(a: AnimalType): SkillLine[] {
  const diet = DIET_SKILLS[a];
  const lines: SkillLine[] = [
    { name: 'Efficient Feeding', label: `корм ×${fmtRanks(skillRanks('Efficient Feeding'))}` },
    {
      name: diet,
      label: `корм ${ANIMAL_LABEL[a].toLowerCase()} ×${fmtRanks(skillRanks(diet, 'buff'))}, остальным ×${fmtRanks(skillRanks(diet, 'debuff'))}`,
    },
    ...ANIMALS.filter((x) => x !== a).map((x) => ({
      name: DIET_SKILLS[x],
      label: `корм ${ANIMAL_LABEL[x].toLowerCase()} дешевле, этим животным ×${fmtRanks(skillRanks(DIET_SKILLS[x], 'debuff'))}`,
    })),
    {
      name: 'Chonky Feed',
      label: `опыт за корм ×${fmtRanks(skillRanks('Chonky Feed', 'xp'))}, корм ×${fmtRanks(skillRanks('Chonky Feed', 'feed'))}`,
    },
    { name: 'Heartwarming Instruments', label: `опыт поглаживания +${fmtRanks(skillRanks('Heartwarming Instruments').map((v) => v * 100))}%` },
    { name: 'Restless Animals', label: `сон ×${fmtRanks(skillRanks('Restless Animals'))}` },
  ];
  if (a === 'Chicken' || a === 'Cow' || a === 'Sheep') {
    lines.push({ name: 'Abundant Harvest', label: `+${fmtRanks(skillRanks('Abundant Harvest'))} яиц, шерсти и молока` });
    lines.push({ name: 'Double Bale', label: `Bale ×${fmtRanks(skillRanks('Double Bale'))}` });
  }
  if (a === 'Chicken' || a === 'Cow' || a === 'Sheep') {
    lines.push({ name: 'Fine Fibers', label: `+${fmtRanks(skillRanks('Fine Fibers'))} перьев, мериноса и кожи` });
    const fibres: [SkillName, string][] = [
      ['Featherweight', 'перьев'],
      ['Merino Whisperer', 'мериноса'],
      ['Leathercraft Mastery', 'кожи'],
    ];
    for (const [s, what] of fibres) {
      lines.push({
        name: s,
        label: `+${fmtRanks(skillRanks(s, 'buff'))} ${what}, двум другим −${fmtRanks(skillRanks(s, 'debuff'))}`,
      });
    }
  }
  if (a === 'Pig') {
    lines.push({ name: 'Truffle Yield', label: `трюфели ×${fmtRanks(skillRanks('Truffle Yield').map((v) => 1 + v))}` });
    lines.push({ name: 'Bristle Payout', label: `щетина при сдаче ×${fmtRanks(skillRanks('Bristle Payout').map((v) => 1 + v))}` });
  }
  return lines;
}

const FEED_BUFFS: { key: FeedBuff; label: string }[] = [
  { key: 'none', label: 'без лакомства' },
  { key: 'Honey Treat', label: 'Honey Treat — корм ×0,75' },
  { key: 'Salt Lick', label: 'Salt Lick — продукция ×1,05' },
  { key: 'Truffle Seasoning', label: 'Truffle Seasoning — сон ×0,5' },
];

/** Текущий курс Flower в $ (для перевода гемов во Flower). */
function useFlowerUsd(): number | null {
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/prices/flower-rate.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setRate(d?.usdPerFlower ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return rate;
}

const packLabel = (gems: number, usd: number) => `${gems.toLocaleString('ru-RU')} за $${usd.toLocaleString('ru-RU')}`;

function ProduceChips({ row }: { row: CycleRow }) {
  return (
    <span className="ref-resource-chips">
      {row.produce.map((p) => (
        <span className="ref-resource-chip" key={p.name} title={p.amount !== p.base ? `без бустов: ${p.base}` : undefined}>
          <Icon name={p.name} />
          {num(p.amount)}× {p.name}
        </span>
      ))}
    </span>
  );
}

function FoodCell({ row, loading }: { row: CycleRow; loading: boolean }) {
  if (row.free) return <span className="ref-price-hint">бесплатно</span>;
  const [ingName, ingQty] = row.foodUnitPrice.ingredients.length === 1 ? row.foodUnitPrice.ingredients[0] : [null, 0];
  return (
    <span className="ac-food">
      <span>
        <Icon name={row.food} />
        {num(row.foodUnits, 1)}× {row.food}
      </span>
      <span className="ref-price-hint">
        {num(row.feeds, 1)} порц. · {num(row.xpPerFeed, 1)} опыта
        {row.food.endsWith('Slop') && ingName && !loading && (
          <>
            {' '}· из {ingQty}× {ingName}
          </>
        )}
        {row.food === 'Omnifeed' && <> · {num(row.foodUnits, 1)} Gem</>}
      </span>
    </span>
  );
}

export default function AnimalsCalculator() {
  const [animal, setAnimal] = useState<AnimalType>('Chicken');
  const [boosts, setBoosts] = useState<AnimalBoosts>(NO_ANIMAL_BOOSTS);
  const prices = useItemPrices([...ANIMAL_PRICE_NAMES, ...FERMENTATION_PRICE_NAMES]);
  const { rate } = useCoinRate();
  const flowerUsd = useFlowerUsd();
  const [gemPack, setGemPack] = useState(DEFAULT_GEM_PACK);
  const [payFlower, setPayFlower] = useState(false);
  const pack = GEM_PACKS.find((p) => p.gems === gemPack)!;
  const gemFlower = flowerUsd ? gemUsd(gemPack, payFlower) / flowerUsd : null;
  const loading = prices == null;

  const set = <K extends keyof AnimalBoosts>(key: K, value: AnimalBoosts[K]) => setBoosts((b) => ({ ...b, [key]: value }));
  const setItem = (name: string, on: boolean) => setBoosts((b) => ({ ...b, items: { ...b.items, [name]: on } }));
  const setSkill = (name: SkillName, r: Rank) => setBoosts((b) => ({ ...b, skills: { ...b.skills, [name]: r } }));
  const setBud = (patch: Partial<AnimalBoosts['bud']>) => setBoosts((b) => ({ ...b, bud: { ...b.bud, ...patch } }));

  const rows = useMemo(
    () => Array.from({ length: MAX_LEVEL + 1 }, (_, level) => cycleRow(animal, level, boosts, prices ?? {}, gemFlower)),
    [animal, boosts, prices, gemFlower],
  );

  // Лакомство из стойки специй: себестоимость по рецепту / число сборов, которое оно держится.
  const treat = useMemo(() => {
    if (boosts.feedBuff === 'none' || !prices) return null;
    const unit = createPricer(prices, rate, NO_AGING_BOOSTS).unitPrice(boosts.feedBuff).unit;
    const harvests = buffHarvests(boosts.feedBuff, boosts);
    return { unit, harvests, perCycle: unit == null ? null : unit / harvests };
  }, [boosts, prices, rate]);

  const max = rows[MAX_LEVEL];
  const treatCost = treat?.perCycle ?? 0;
  const maxCost = max.feedCost == null ? null : max.feedCost + treatCost;
  const maxProfit = max.produceValue == null || maxCost == null ? null : max.produceValue - maxCost;
  const perDay = 24 / max.sleepHours;
  const love = averageLoveXp(animal, MAX_LEVEL, boosts);

  const items = ITEM_BOOSTS.filter((b) => b.animals.includes(animal));
  const changed = JSON.stringify(boosts) !== JSON.stringify(NO_ANIMAL_BOOSTS);

  return (
    <div className="ac">
      <div className="ac-tabs" role="tablist">
        {ANIMALS.map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={a === animal}
            className={`ac-tab${a === animal ? ' ac-tab--active' : ''}`}
            onClick={() => setAnimal(a)}
          >
            <Icon name={a} size={26} />
            {ANIMAL_LABEL[a]}
          </button>
        ))}
      </div>

      <p className="ref-section-desc ac-facts">
        Живут в здании <strong>{ANIMAL_BUILDING[animal]}</strong>, покупка — {ANIMAL_COINS[animal]} монет. Порция корма —{' '}
        {REQUIRED_FOOD_QTY[animal]} шт. {animal === 'Pig' ? 'Едят только помои (Slop) четырёх уровней; ' : 'Едят Kernel Blend, Hay, NutriBarley, Mixed Grain и Omnifeed; '}
        любимый корм меняется на 3, 6 и 10 уровнях.
      </p>

      <div className="ac-settings">
        <label className="ref-marvel-boost-check">
          <Icon name="Music Box" />
          <span>Поглаживаний за сон</span>
          <select value={boosts.loves} onChange={(e) => set('loves', Number(e.target.value) as 0 | 1 | 2)} className="ref-food-rank-select">
            <option value={0}>не гладить</option>
            <option value={1}>1</option>
            <option value={2}>2 (максимум)</option>
          </select>
        </label>
        <label className="ref-marvel-boost-check">
          <Icon name={boosts.feedBuff === 'none' ? 'Honey Treat' : boosts.feedBuff} />
          <span>Лакомство</span>
          <select value={boosts.feedBuff} onChange={(e) => set('feedBuff', e.target.value as FeedBuff)} className="ref-food-rank-select">
            {FEED_BUFFS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        {canEatOmnifeed(animal) && (
          <label className="ref-marvel-boost-check">
            <Icon name={boosts.omnifeed ? 'Omnifeed' : 'Mixed Grain'} />
            <span>Корм</span>
            <select value={boosts.omnifeed ? 'omni' : 'fav'} onChange={(e) => set('omnifeed', e.target.value === 'omni')} className="ref-food-rank-select">
              <option value="fav">любимый корм уровня</option>
              <option value="omni">Omnifeed (1 Gem за штуку)</option>
            </select>
          </label>
        )}
        {boosts.omnifeed && canEatOmnifeed(animal) && (
          <>
            <label className="ref-marvel-boost-check">
              <Icon name="Omnifeed" />
              <span>Пак гемов</span>
              <select value={gemPack} onChange={(e) => setGemPack(Number(e.target.value))} className="ref-food-rank-select">
                {GEM_PACKS.map((p) => (
                  <option key={p.gems} value={p.gems}>
                    {packLabel(p.gems, p.usd)}
                    {p.flowerOnly ? ' (только за Flower)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="ref-marvel-boost-check">
              <input
                type="checkbox"
                checked={payFlower || !!pack.flowerOnly}
                disabled={!!pack.flowerOnly}
                onChange={(e) => setPayFlower(e.target.checked)}
              />
              <span>Оплата Flower (−{FLOWER_PAYMENT_DISCOUNT * 100}%)</span>
            </label>
          </>
        )}
        {animal === 'Pig' && (
          <label className="ref-marvel-boost-check">
            <input type="checkbox" checked={boosts.mud} onChange={(e) => set('mud', e.target.checked)} />
            <Icon name="Mud" />
            <span>
              Грязь — опыт за корм ×1,25 ({MUD_PER_APPLICATION} Mud на {buffHarvests('Mud', boosts)} сбора, цена не учитывается)
            </span>
          </label>
        )}
      </div>

      <BoostPanel title={`Бусты: ${ANIMAL_LABEL[animal].toLowerCase()}`}>
        <div className="ref-marvel-boost-widget ref-fishing-boosts">
          <div className="ref-food-boost-checks">
            {items.map((b) => (
              <label className="ref-marvel-boost-check" key={b.name}>
                <input type="checkbox" checked={!!boosts.items[b.name]} onChange={(e) => setItem(b.name, e.target.checked)} />
                <Icon name={b.name} />
                <span>
                  {b.name} — {itemEffect(b)}
                </span>
              </label>
            ))}
            {animal !== 'Pig' && animal !== 'Chicken' && (
              <label className="ref-marvel-boost-check">
                <input type="checkbox" checked={boosts.baleEconomy} onChange={(e) => set('baleEconomy', e.target.checked)} />
                <Icon name="Bale" />
                <span>Bale Economy (навык) — Bale даёт ещё шерсть и молоко</span>
              </label>
            )}
          </div>
          <div className="ref-food-boost-selects">
            {skillLines(animal).map((s) => (
              <label className="ref-marvel-boost-check" key={s.name}>
                <Icon name={s.name} />
                <span>
                  {s.name} — {s.label}
                </span>
                <select
                  value={boosts.skills[s.name] ?? 0}
                  onChange={(e) => setSkill(s.name, Number(e.target.value) as Rank)}
                  className="ref-food-rank-select"
                >
                  <option value={0}>выкл</option>
                  {[1, 2, 3].map((r) => (
                    <option key={r} value={r}>
                      ранг {r}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="ref-food-boost-selects ac-extra">
            <label className="ref-marvel-boost-check">
              <input type="checkbox" checked={boosts.bud.retreat} onChange={(e) => setBud({ retreat: e.target.checked })} />
              <span>Бад с типом Retreat — +0,2 ко всей продукции животных × аура</span>
            </label>
            {animal === 'Chicken' && (
              <label className="ref-marvel-boost-check">
                <input type="checkbox" checked={boosts.bud.eggHead} onChange={(e) => setBud({ eggHead: e.target.checked })} />
                <span>Бад со стеблем Egg Head — +0,2 яиц × аура</span>
              </label>
            )}
            <label className="ref-marvel-boost-check">
              <span>Аура бада</span>
              <select value={boosts.bud.aura} onChange={(e) => setBud({ aura: e.target.value as BudAura })} className="ref-food-rank-select">
                {(Object.keys(BUD_AURA) as BudAura[]).map((a) => (
                  <option key={a} value={a}>
                    {a === 'none' ? 'без ауры (×1)' : `${a} (×${num(BUD_AURA[a])})`}
                  </option>
                ))}
              </select>
            </label>
            <label className="ref-marvel-boost-check" title="Шанс бросает сервер игры, в открытом коде его нет — укажите свой">
              <span>Buckaroo (старый навык) — шанс двойного сбора, %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={boosts.buckarooChance}
                onChange={(e) => set('buckarooChance', Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="ref-food-rank-select ac-num-input"
              />
            </label>
          </div>
          {changed && (
            <p className="ref-fishing-boosts-sum">
              <button type="button" className="gc-btn-secondary ref-fish-reset" onClick={() => setBoosts(NO_ANIMAL_BOOSTS)}>
                Сбросить бусты
              </button>
            </p>
          )}
        </div>
      </BoostPanel>

      <div className="ac-summary gc-card">
        <div className="ac-summary-head">
          <Icon name={animal} size={36} />
          <div>
            <strong>Максимальный уровень ({MAX_LEVEL}) — один цикл</strong>
            <span className="ref-price-hint">
              сон {hours(max.sleepHours)} · ≈ {num(perDay, 2)} цикла в сутки · поглаживание в среднем {num(love.xp, 1)} опыта (
              {love.chances.map(([item, p]) => `${item} ${Math.round(p * 100)}%`).join(', ')})
            </span>
          </div>
        </div>
        <div className="ac-summary-grid">
          <div>
            <span className="ac-summary-label">Продукция</span>
            <ProduceChips row={max} />
            <Price value={max.produceValue} loading={loading} />
          </div>
          <div>
            <span className="ac-summary-label">Корм</span>
            <FoodCell row={max} loading={loading} />
            <Price value={max.feedCost} loading={loading} />
          </div>
          {boosts.feedBuff !== 'none' && (
            <div>
              <span className="ac-summary-label">Лакомство</span>
              <span>
                <Icon name={boosts.feedBuff} />
                {boosts.feedBuff}: 1 шт на {treat?.harvests ?? buffHarvests(boosts.feedBuff, boosts)}{' '}
                {boosts.feedBuff === 'Truffle Seasoning' ? 'сон' : 'сбора'}
              </span>
              <Price value={treat?.perCycle ?? null} loading={loading} />
            </div>
          )}
          <div>
            <span className="ac-summary-label">Итог за цикл</span>
            <strong className={maxProfit != null && maxProfit < 0 ? 'ac-neg' : 'ac-pos'}>
              <Price value={maxProfit} loading={loading} />
            </strong>
            {maxProfit != null && (
              <span className="ref-price-hint">
                в сутки ≈ <FlowerAmount compact value={maxProfit * perDay} />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="gc-sortable-wrap">
        <table className="gc-sortable-table ac-table">
          <thead>
            <tr>
              <th>Уровень</th>
              <th>Опыт за цикл</th>
              <th>Поглаживания</th>
              <th>Корм</th>
              <th>Цена корма</th>
              <th>Продукция</th>
              <th>Стоимость</th>
              <th>Итог</th>
              {animal === 'Pig' && <th>Щетина при сдаче</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cost = r.feedCost == null ? null : r.feedCost + treatCost;
              const profit = r.produceValue == null || cost == null ? null : r.produceValue - cost;
              return (
                <tr key={r.level} className={r.level === MAX_LEVEL ? 'ac-row-max' : undefined}>
                  <td className="gc-sortable-name" data-label="Уровень">
                    {r.level === MAX_LEVEL ? `${MAX_LEVEL} (круг)` : `${r.level} → ${r.level + 1}`}
                  </td>
                  <td data-label="Опыт за цикл">{num(r.xpNeeded, 0)}</td>
                  <td data-label="Поглаживания">{boosts.loves ? `−${num(r.loveXp, 1)}` : '—'}</td>
                  <td data-label="Корм">
                    <FoodCell row={r} loading={loading} />
                  </td>
                  <td data-label="Цена корма">
                    <Price value={r.feedCost} loading={loading} />
                  </td>
                  <td className="ref-table-resources" data-label="Продукция">
                    <ProduceChips row={r} />
                  </td>
                  <td data-label="Стоимость">
                    <Price value={r.produceValue} loading={loading} />
                  </td>
                  <td data-label="Итог" className={profit != null && profit < 0 ? 'ac-neg' : 'ac-pos'}>
                    <Price value={profit} loading={loading} />
                  </td>
                  {animal === 'Pig' && (
                    <td data-label="Щетина при сдаче">
                      {pigBristles(r.level, boosts) ? (
                        <>
                          <Icon name="Pig Bristles" />
                          {num(pigBristles(r.level, boosts))}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ref-price-hint ac-foot">
        Опыт поглаживания: Petting Hand {LOVE_ITEM_XP['Petting Hand']}, Brush {LOVE_ITEM_XP.Brush}, Music Box{' '}
        {LOVE_ITEM_XP['Music Box']}. Порции — в среднем: лишний опыт переходит на следующий цикл.
        Засчитывается один бад — лучший; Buckaroo — в среднем по указанному шансу.
        {gemFlower != null && (
          <>
            {' '}1 Gem ≈ <FlowerAmount compact value={gemFlower} /> (пак {packLabel(pack.gems, pack.usd)}
            {payFlower || pack.flowerOnly ? `, оплата Flower −${FLOWER_PAYMENT_DISCOUNT * 100}%` : ''}).
          </>
        )} «Итог» = продукция по
        floor − корм{boosts.feedBuff !== 'none' ? ' − лакомство' : ''}.
      </p>
    </div>
  );
}
