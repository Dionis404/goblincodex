import { useMemo, useState } from 'react';
import './XpCalculator.css';
import NumberStepper from '../NumberStepper';
import { FlowerAmount } from '../ResourceIcon';
import FOOD_ICONS from '../../lib/foodIcons.json';
import { TimeBoostsPanel, XpBoostsPanel } from './FoodBoostPanels';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import {
  BUILDINGS,
  FOOD_ALL_PRICE_NAMES,
  NO_TIME_BOOSTS,
  NO_XP_BOOSTS,
  withBaitPrices,
  type Building,
  type TimeBoosts,
  type XpBoosts,
} from '../../lib/food';
import { buildDishes, planCurve, planFor, type Plan, type PlanInput, type PlanMode } from '../../lib/xpPlan';
import {
  PRE_ASCENSION_MAX_LEVEL,
  LEVELS_PER_ASCENSION,
  levelForXp,
  levelSpan,
  maxLevelFor,
  totalXpFromPosition,
  xpForLevel,
  ascensionBaseline,
  ascensionCumulativeAtLevel,
  ascensionStandingForXp,
} from '../../lib/bumpkinXp';

function fmt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

/** Срок: до двух суток — в часах, дальше — в днях (с месяцами для длинных). */
function fmtDays(days: number): string {
  if (days < 2) return `${(days * 24).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ч`;
  const d = Math.ceil(days);
  return days >= 60 ? `${d.toLocaleString('ru-RU')} дн. (≈ ${(days / 30).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} мес.)` : `${d} дн.`;
}

type Target =
  | { kind: 'level'; level: number }
  | { kind: 'ascension'; ascension: number; level: number };

function rangeOptions(min: number, max: number): number[] {
  const opts: number[] = [];
  for (let n = min; n <= max; n++) opts.push(n);
  return opts;
}

/** Целевая точка: обычный уровень (только пока не поднимался в Возвышение) или Возвышение+уровень. */
function TargetPicker({
  value,
  onChange,
  allowLevel,
}: {
  value: Target;
  onChange: (v: Target) => void;
  allowLevel: boolean;
}) {
  const level = value.kind === 'level' ? value.level : PRE_ASCENSION_MAX_LEVEL;
  const ascension = value.kind === 'ascension' ? value.ascension : 1;
  const ascLevel = value.kind === 'ascension' ? value.level : LEVELS_PER_ASCENSION;

  return (
    <div className="gc-calc-field gc-exp-picker">
      <span>Хочу дойти до</span>
      <div className="gc-exp-picker-tabs">
        {allowLevel && (
          <button
            type="button"
            className="gc-exp-picker-tab"
            data-active={value.kind === 'level'}
            onClick={() => onChange({ kind: 'level', level })}
          >
            Уровня (1–{PRE_ASCENSION_MAX_LEVEL})
          </button>
        )}
        <button
          type="button"
          className="gc-exp-picker-tab"
          data-active={value.kind === 'ascension'}
          onClick={() => onChange({ kind: 'ascension', ascension, level: ascLevel })}
        >
          Возвышения
        </button>
      </div>

      {value.kind === 'level' && (
        <select value={level} onChange={(e) => onChange({ kind: 'level', level: Number(e.target.value) })}>
          {rangeOptions(2, PRE_ASCENSION_MAX_LEVEL).map((n) => (
            <option key={n} value={n}>
              Уровень {n}
            </option>
          ))}
        </select>
      )}

      {value.kind === 'ascension' && (
        <div className="gc-exp-picker-row">
          <label className="gc-exp-picker-inline">
            <span>Возвышение №</span>
            <NumberStepper
              value={ascension}
              onChange={(next) => onChange({ kind: 'ascension', ascension: next, level: ascLevel })}
              min={1}
              max={50}
            />
          </label>
          <select
            value={ascLevel}
            onChange={(e) => onChange({ kind: 'ascension', ascension, level: Number(e.target.value) })}
          >
            {rangeOptions(1, LEVELS_PER_ASCENSION).map((n) => (
              <option key={n} value={n}>
                Уровень {n}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

const PRESETS: { key: Exclude<PlanMode, 'custom'>; icon: string; label: string; hint: string }[] = [
  { key: 'fast', icon: '⚡', label: 'Быстрее всего', hint: 'Все здания заняты самыми «быстрыми по опыту» блюдами' },
  { key: 'balanced', icon: '⚖️', label: 'Оптимально', hint: 'Баланс срока и цены: дальше экономить уже слишком долго' },
  { key: 'cheap', icon: '💰', label: 'Дешевле всего', hint: 'Минимальная цена в пределах выбранного максимального срока' },
];

function dishIcon(name: string): string | undefined {
  return (FOOD_ICONS as Record<string, string>)[name];
}

function buildingLabel(key: Building): string {
  return BUILDINGS.find((b) => b.key === key)?.label ?? key;
}

function PlanDetails({ plan, hoursPerDay }: { plan: Plan; hoursPerDay: number }) {
  const rows = plan.cooking.allocations.filter((a) => a.count >= 0.5);
  const vipDishes = Object.entries(plan.free.dishes);
  return (
    <>
      {vipDishes.length > 0 && (
        <div className="gc-xpp-vip">
          <strong>Бесплатно за вход (VIP):</strong>{' '}
          {vipDishes.map(([name, n], i) => (
            <span key={name} className="gc-xpp-vip-dish">
              {dishIcon(name) && <img src={dishIcon(name)} alt="" />}
              {name} × {n}
              {i < vipDishes.length - 1 ? ',' : ''}
            </span>
          ))}
          <span className="gc-calc-note">
            {' '}
            — это {fmt(plan.free.xp)} опыта ({plan.gain > 0 ? Math.round((plan.free.xp / plan.gain) * 100) : 0}% пути)
            {plan.free.valueKnown && plan.free.value > 0 && (
              <>
                ; приготовить их стоило бы ≈ <FlowerAmount compact value={plan.free.value} />
              </>
            )}
            . Эти блюда уже учтены: готовить нужно только остальной опыт.
          </span>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="gc-calc-note">Готовить ничего не нужно — опыта хватает за счёт бесплатных блюд.</p>
      ) : (
        <div className="gc-calc-table-wrap">
          <table className="gc-calc-table gc-xpp-table">
            <thead>
              <tr>
                <th>Здание</th>
                <th>Блюдо</th>
                <th>Сколько</th>
                <th>Время работы</th>
                <th>Опыт</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.dish.recipe.name}>
                  <td data-label="Здание">{buildingLabel(a.dish.building)}</td>
                  <td data-label="Блюдо">
                    <span className="gc-xpp-dish">
                      {dishIcon(a.dish.recipe.name) && <img src={dishIcon(a.dish.recipe.name)} alt="" />}
                      {a.dish.recipe.name}
                    </span>
                  </td>
                  <td className="gc-calc-num" data-label="Сколько">× {fmt(a.count)}</td>
                  <td className="gc-calc-num" data-label="Время работы">
                    {a.hours >= hoursPerDay * 2 ? `${Math.round(a.hours / hoursPerDay)} дн.` : `${Math.round(a.hours)} ч`}
                  </td>
                  <td className="gc-calc-num" data-label="Опыт">{fmt(a.xp)}</td>
                  <td className="gc-calc-num" data-label="Цена">≈ <FlowerAmount compact value={a.cost} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function XpCalculator() {
  // ── где сейчас игрок ──
  const [inputMode, setInputMode] = useState<'position' | 'total'>('position');
  const [ascensionsDone, setAscensionsDone] = useState(0);
  const [level, setLevel] = useState(1);
  const [xpInLevel, setXpInLevel] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [target, setTarget] = useState<Target>({ kind: 'level', level: PRE_ASCENSION_MAX_LEVEL });

  // ── план ──
  const [xpBoosts, setXpBoosts] = useState<XpBoosts>(NO_XP_BOOSTS);
  const [timeBoosts, setTimeBoosts] = useState<TimeBoosts>(NO_TIME_BOOSTS);
  const [enabled, setEnabled] = useState<Building[]>(BUILDINGS.map((b) => b.key));
  const [hoursPerDay, setHoursPerDay] = useState(24);
  const [stretch, setStretch] = useState(3);
  const [mode, setMode] = useState<PlanMode>('balanced');
  const [customDays, setCustomDays] = useState(100);

  const hasAscended = ascensionsDone >= 1;
  const maxLevel = maxLevelFor(ascensionsDone);
  const safeLevel = Math.min(Math.max(level, 1), maxLevel);
  const span = levelSpan(ascensionsDone, safeLevel);
  const xpTooBig = inputMode === 'position' && span > 0 && xpInLevel >= span;
  const safeXpInLevel = span > 0 ? Math.min(Math.max(xpInLevel, 0), span - 1) : 0;

  const experience =
    inputMode === 'total' ? Math.max(0, totalXp) : totalXpFromPosition(ascensionsDone, safeLevel, safeXpInLevel);

  // Положение для отображения прогресса.
  const current = hasAscended
    ? ascensionStandingForXp(experience, ascensionsDone)
    : (() => {
        const lvl = levelForXp(experience);
        const currentLevelXp = xpForLevel(lvl);
        const nextLevelXp = lvl >= PRE_ASCENSION_MAX_LEVEL ? currentLevelXp : xpForLevel(lvl + 1);
        return { level: lvl, currentProgress: experience - currentLevelXp, experienceToNextLevel: nextLevelXp - currentLevelXp };
      })();

  const targetXp =
    target.kind === 'level'
      ? xpForLevel(target.level)
      : ascensionBaseline(target.ascension) + ascensionCumulativeAtLevel(target.ascension, target.level);
  const remaining = Math.max(0, targetXp - experience);
  const alreadyThere = experience >= targetXp;
  const progressPct =
    current.experienceToNextLevel > 0
      ? Math.min(100, Math.max(0, (current.currentProgress / current.experienceToNextLevel) * 100))
      : 100;

  // ── цены и блюда ──
  const marketPrices = useItemPrices(FOOD_ALL_PRICE_NAMES);
  const { rate: coinRate } = useCoinRate();
  const prices = useMemo(
    () => (marketPrices && coinRate !== undefined ? withBaitPrices(marketPrices, coinRate) : null),
    [marketPrices, coinRate],
  );
  const dishes = useMemo(() => (prices ? buildDishes(prices, xpBoosts, timeBoosts) : []), [prices, xpBoosts, timeBoosts]);
  const vip = xpBoosts.vip;

  const input: PlanInput | null = useMemo(
    () =>
      prices && dishes.length > 0 && enabled.length > 0
        ? { startXp: experience, targetXp, ascended: hasAscended, dishes, enabled, xpBoosts, vip, prices, hoursPerDay }
        : null,
    [prices, dishes, enabled, experience, targetXp, hasAscended, xpBoosts, vip, hoursPerDay],
  );
  const curve = useMemo(() => (input && remaining > 0 ? planCurve(input, stretch) : null), [input, remaining, stretch]);
  const plan: Plan | null =
    remaining <= 0 || !input ? null : mode === 'custom' ? planFor(input, Math.max(0.01, customDays)) : (curve?.[mode] ?? null);

  function toggleBuilding(b: Building, on: boolean) {
    setEnabled((prev) => (on ? [...prev, b] : prev.filter((x) => x !== b)));
  }

  return (
    <div className="gc-xpp">
      {/* ── 1. Где вы сейчас ── */}
      <div className="gc-calc-card gc-xpp-card">
        <h2 className="gc-calc-h2">Где вы сейчас</h2>
        <p className="gc-calc-note gc-xpp-howto">
          Откройте окно Бампкина в игре (вкладка <b>Feed</b>): над полоской опыта написано, например,{' '}
          <span className="gc-xpp-mock">Ascension 0 · Level 141 · 200401/1905000 XP</span>. Введите эти три числа:
          возвышение, уровень и первое число опыта — общий опыт посчитаем сами.
        </p>

        <div className="gc-xpp-tabs">
          <button type="button" className="gc-exp-picker-tab" data-active={inputMode === 'position'} onClick={() => setInputMode('position')}>
            Как в игре: уровень и опыт
          </button>
          <button type="button" className="gc-exp-picker-tab" data-active={inputMode === 'total'} onClick={() => setInputMode('total')}>
            У меня есть общий опыт
          </button>
        </div>

        {inputMode === 'position' ? (
          <div className="gc-xpp-fields">
            <label className="gc-calc-field">
              <span>Возвышение (Ascension)</span>
              <NumberStepper value={ascensionsDone} onChange={(v) => { setAscensionsDone(v); setLevel(1); setXpInLevel(0); }} min={0} max={50} />
              <small>0 — ещё не возвышались.</small>
            </label>
            <label className="gc-calc-field">
              <span>Уровень (Level)</span>
              <NumberStepper value={safeLevel} onChange={setLevel} min={1} max={maxLevel} />
              <small>{hasAscended ? `от 1 до ${LEVELS_PER_ASCENSION} внутри возвышения` : `от 1 до ${PRE_ASCENSION_MAX_LEVEL}`}</small>
            </label>
            <label className="gc-calc-field">
              <span>Опыт на уровне (первое число)</span>
              <input
                type="number"
                min={0}
                value={xpInLevel}
                onChange={(e) => setXpInLevel(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              />
              <small>
                {span > 0 ? (
                  <>
                    на этом уровне в игре будет «<b>{fmt(safeXpInLevel)}</b> / {fmt(span)}» — второе число у вас должно совпасть
                  </>
                ) : (
                  'максимальный уровень'
                )}
              </small>
            </label>
          </div>
        ) : (
          <div className="gc-xpp-fields">
            <label className="gc-calc-field">
              <span>Общий опыт бампкина</span>
              <input type="number" min={0} value={totalXp} onChange={(e) => setTotalXp(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <label className="gc-calc-field">
              <span>Возвышение (Ascension)</span>
              <NumberStepper value={ascensionsDone} onChange={setAscensionsDone} min={0} max={50} />
              <small>0 — ещё не возвышались, уровень по таблице до {PRE_ASCENSION_MAX_LEVEL}.</small>
            </label>
          </div>
        )}
        {xpTooBig && (
          <p className="gc-xpp-warn">
            Опыт на уровне не может быть {fmt(xpInLevel)}: для перехода на следующий уровень нужно {fmt(span)}. Считаем как {fmt(safeXpInLevel)}.
          </p>
        )}

        <div className="gc-xpp-now">
          <div>
            <span className="gc-xpp-now-label">Сейчас</span>
            <strong>
              {hasAscended ? `Возвышение ${ascensionsDone}, уровень ${current.level}` : `Уровень ${current.level}`}
            </strong>
          </div>
          <div>
            <span className="gc-xpp-now-label">Общий опыт</span>
            <strong>{fmt(experience)}</strong>
          </div>
          <div>
            <span className="gc-xpp-now-label">До следующего уровня</span>
            <strong>
              {current.level >= maxLevel ? '—' : fmt(Math.max(0, current.experienceToNextLevel - current.currentProgress))}
            </strong>
          </div>
        </div>
        <div className="gc-xp-progress-bar">
          <div className="gc-xp-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── 2. Цель ── */}
      <div className="gc-calc-card gc-xpp-card">
        <h2 className="gc-calc-h2">Цель</h2>
        <TargetPicker value={target} onChange={setTarget} allowLevel={!hasAscended} />
        <div className="gc-xpp-now">
          <div>
            <span className="gc-xpp-now-label">Опыт нужен всего</span>
            <strong>{fmt(targetXp)}</strong>
          </div>
          <div>
            <span className="gc-xpp-now-label">Осталось набрать</span>
            <strong>{alreadyThere ? 'Уже там!' : fmt(remaining)}</strong>
          </div>
        </div>
      </div>

      {/* ── 3. Параметры плана ── */}
      {!alreadyThere && (
        <div className="gc-calc-card gc-xpp-card">
          <h2 className="gc-calc-h2">Как качаться</h2>

          <label className="gc-xpp-vip-toggle">
            <input type="checkbox" checked={xpBoosts.vip} onChange={(e) => setXpBoosts({ ...xpBoosts, vip: e.target.checked })} />
            <span>
              <b>У меня есть VIP</b> — +10% к опыту от еды и ежедневное блюдо за вход (по вашему уровню: от Mushroom Soup до Honey Cheddar с 100-го)
            </span>
          </label>

          <div className="gc-xpp-fields">
            <div className="gc-calc-field">
              <span>Какие здания у вас есть</span>
              <div className="gc-xpp-buildings">
                {BUILDINGS.map((b) => (
                  <label key={b.key} className="gc-xpp-chip">
                    <input type="checkbox" checked={enabled.includes(b.key)} onChange={(e) => toggleBuilding(b.key, e.target.checked)} />
                    <span>{b.icon} {b.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <label className="gc-calc-field">
              <span>Сколько часов в сутки здания готовят</span>
              <select value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))}>
                <option value={24}>24 — без простоев</option>
                <option value={18}>18</option>
                <option value={12}>12</option>
                <option value={8}>8</option>
              </select>
              <small>Если заходите редко, здания простаивают после окончания готовки.</small>
            </label>
            <label className="gc-calc-field">
              <span>«Дешевле всего»: готов ждать</span>
              <select value={stretch} onChange={(e) => setStretch(Number(e.target.value))}>
                <option value={2}>до ×2 от самого быстрого срока</option>
                <option value={3}>до ×3</option>
                <option value={5}>до ×5</option>
                <option value={10}>до ×10</option>
              </select>
              <small>Чем дольше срок, тем дешевле: это предел, дальше «дешёвый» план не растягиваем.</small>
            </label>
          </div>

          <TimeBoostsPanel boosts={timeBoosts} onChange={setTimeBoosts} />
          <XpBoostsPanel boosts={xpBoosts} onChange={setXpBoosts} />
        </div>
      )}

      {/* ── 4. Результат ── */}
      {!alreadyThere && (
        <div className="gc-calc-card gc-xpp-card">
          <h2 className="gc-calc-h2">План прокачки</h2>
          {!prices ? (
            <p className="gc-calc-note">Загружаю цены…</p>
          ) : enabled.length === 0 ? (
            <p className="gc-calc-note">Отметьте хотя бы одно здание.</p>
          ) : dishes.length === 0 ? (
            <p className="gc-calc-note">Не удалось посчитать цены блюд — попробуйте позже.</p>
          ) : !curve ? (
            <p className="gc-calc-note">Для выбранных зданий не нашлось блюд — отметьте больше зданий.</p>
          ) : (
            <>
              <div className="gc-xpp-presets" role="group" aria-label="Что важнее">
                {PRESETS.map((p) => {
                  const pl = curve[p.key];
                  return (
                    <button
                      key={p.key}
                      type="button"
                      className="gc-xpp-preset"
                      data-active={mode === p.key}
                      aria-pressed={mode === p.key}
                      title={p.hint}
                      onClick={() => setMode(p.key)}
                    >
                      <span className="gc-xpp-preset-name">{p.icon} {p.label}</span>
                      <span className="gc-xpp-preset-main">{fmtDays(pl.days)}</span>
                      <span className="gc-xpp-preset-sub">≈ <FlowerAmount compact value={pl.cost} /></span>
                    </button>
                  );
                })}
                <div className="gc-xpp-preset gc-xpp-preset--custom" data-active={mode === 'custom'}>
                  <span className="gc-xpp-preset-name">🎯 Свой срок</span>
                  <span className="gc-xpp-preset-main">
                    <input
                      type="number"
                      min={0.1}
                      step={1}
                      value={customDays}
                      onChange={(e) => { setCustomDays(Math.max(0.1, Number(e.target.value) || 0.1)); setMode('custom'); }}
                      onFocus={() => setMode('custom')}
                      aria-label="Свой срок, дней"
                    />{' '}
                    дн.
                  </span>
                  <span className="gc-xpp-preset-sub">от {fmtDays(curve.minDays)}</span>
                </div>
              </div>

              {plan && !plan.feasible ? (
                <p className="gc-xpp-warn">
                  За {customDays} дн. столько опыта не набрать: минимум — {fmtDays(curve.minDays)}. Увеличьте срок.
                </p>
              ) : plan ? (
                <>
                  <div className="gc-exp-kpi-row gc-xpp-kpis">
                    <div className="gc-calc-kpi">
                      <div className="gc-calc-kpi-label">Срок</div>
                      <div className="gc-calc-kpi-value">{fmtDays(plan.days)}</div>
                    </div>
                    <div className="gc-calc-kpi">
                      <div className="gc-calc-kpi-label">Стоимость готовки</div>
                      <div className="gc-calc-kpi-value">≈ <FlowerAmount compact value={plan.cost} /></div>
                    </div>
                    <div className="gc-calc-kpi">
                      <div className="gc-calc-kpi-label">Приготовить опыта</div>
                      <div className="gc-calc-kpi-value">{fmt(plan.cooked)}</div>
                    </div>
                  </div>
                  <PlanDetails plan={plan} hoursPerDay={hoursPerDay} />
                </>
              ) : null}
            </>
          )}

          <ul className="gc-calc-note gc-xpp-notes">
            <li>Цена — по floor-ценам ингредиентов на маркетплейсе (рыбные наживки — по себестоимости); цена масла не входит.</li>
            <li>Здания готовят непрерывно все выбранные часы в сутки; число блюд округлено, поэтому сроки приблизительны.</li>
            <li>Блюда, у которых нет цены на какой-то ингредиент (например, из Magic Mushroom), в план не попадают; блюда новой главы, которых ещё нет в игре, тоже.</li>
            <li>Сырая и выдержанная рыба в расчёт пока не входит.</li>
            <li>Ежедневное VIP-блюдо считается за каждые полные сутки срока; его уровень оценивается по равномерному росту опыта.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
