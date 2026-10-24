import { useMemo, useState } from 'react';
import './FishCatalog.css';
import './FlowerRecipes.css';
import BoostPanel from '../BoostPanel';
import { FlowerAmount, CoinsIcon } from '../ResourceIcon';
import { FLOWER_SEEDS } from '../../lib/flowerData.generated';
import {
  SEED_ORDER,
  flowerIcon,
  flowerPlans,
  formatDays,
  ingredientIcon,
  pickPlan,
  planSteps,
  seedIcon,
  type FlowerBoosts,
  type FlowerPlan,
  type PlanMode,
} from '../../lib/flowers';

const MODES: { key: PlanMode; label: string; hint: string }[] = [
  { key: 'balanced', label: 'Оптимально', hint: 'Баланс цены и времени: из всех стоящих вариантов берётся тот, где «цена × время» меньше всего' },
  { key: 'cheap', label: 'Дешевле всего', hint: 'Минимальная себестоимость, даже если это дольше' },
  { key: 'fast', label: 'Быстрее всего', hint: 'Минимальное время всей цепочки, даже если это дороже' },
];

const MODE_ICON: Record<PlanMode, string> = { balanced: '⚖️', cheap: '💰', fast: '⚡' };

function Summary({ plan }: { plan: FlowerPlan }) {
  return (
    <>
      ≈ <FlowerAmount compact value={plan.cost} /> · {formatDays(plan.days)}
    </>
  );
}

export default function FlowerHelper({
  prices,
  coinRate,
  boosts,
  onJump,
}: {
  prices: Record<string, number | null> | null;
  coinRate: number | null | undefined;
  boosts: FlowerBoosts;
  onJump: (flower: string) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [mode, setMode] = useState<PlanMode>('balanced');
  const plans = useMemo(() => (prices ? flowerPlans(prices, coinRate, boosts) : null), [prices, coinRate, boosts]);

  const options = target && plans ? plans[target] : [];
  const plan = pickPlan(options, mode);
  const steps = plan && prices ? planSteps(plan, prices, coinRate, boosts) : [];
  const chain = plan?.planting ?? 0;
  // Другие приоритеты; если два приводят к одному плану, показываем их одной кнопкой.
  const alternatives: { modes: PlanMode[]; plan: FlowerPlan }[] = [];
  for (const m of ['balanced', 'cheap', 'fast'] as PlanMode[]) {
    if (m === mode) continue;
    const p = pickPlan(options, m);
    if (!p || p === plan) continue;
    const same = alternatives.find((x) => x.plan === p);
    if (same) same.modes.push(m);
    else alternatives.push({ modes: [m], plan: p });
  }

  return (
    <BoostPanel title="🧭 Помощник: подобрать рецепт">
      <div className="ref-marvel-boost-widget ref-flower-helper">
        <p className="ref-section-desc ref-flower-helper-lead">
          Выберите цветок — помощник соберёт всю цепочку посадок: что и из чего сажать, в каком порядке,
          сколько это стоит и как долго. Учитываются бусты с панели выше.
        </p>

        <div className="ref-flower-picker" role="group" aria-label="Нужный цветок">
          {SEED_ORDER.map((seed) => (
            <div className="ref-flower-picker-group" key={seed}>
              <span className="ref-flower-picker-seed">
                <img src={seedIcon(seed)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
                {seed.replace(' Seed', '')}
              </span>
              <span className="ref-flower-picker-items">
                {FLOWER_SEEDS[seed].flowers.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`ref-flower-pick${target === f ? ' ref-flower-pick--on' : ''}`}
                    aria-pressed={target === f}
                    title={f}
                    onClick={() => setTarget(f)}
                  >
                    <img src={flowerIcon(f)} alt={f} />
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="ref-flower-sort" role="group" aria-label="Что важнее">
          <span className="ref-price-hint">Что важнее:</span>
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`gc-btn-secondary ref-flower-sort-btn${mode === m.key ? ' ref-flower-sort-btn--on' : ''}`}
              aria-pressed={mode === m.key}
              title={m.hint}
              onClick={() => setMode(m.key)}
            >
              {MODE_ICON[m.key]} {m.label}
            </button>
          ))}
        </div>

        {!target ? (
          <p className="ref-price-hint">Нажмите на иконку нужного цветка.</p>
        ) : !plans ? (
          <p className="ref-price-hint">Загружаю цены…</p>
        ) : !plan ? (
          <p className="ref-price-hint">Для «{target}» не удалось посчитать рецепт: нет цены на предметы или курса монет.</p>
        ) : (
          <div className="ref-flower-result">
            <div className="ref-flower-result-head">
              <img src={flowerIcon(plan.flower)} alt="" className="ref-flower-result-icon" />
              <div>
                <strong className="ref-comp-name">{plan.flower}</strong>
                <span className="ref-tool-sub">
                  {MODE_ICON[mode]} {MODES.find((m) => m.key === mode)!.label}: <Summary plan={plan} />
                  {' · '}
                  <button type="button" className="ref-flower-linkbtn" onClick={() => onJump(plan.flower)}>
                    все рецепты цветка ↓
                  </button>
                </span>
              </div>
            </div>

            <ol className="ref-flower-steps">
              {steps.map((s, i) => (
                <li key={`${s.flower}-${i}`} className="ref-flower-step">
                  <span className="ref-flower-step-n">{i + 1}</span>
                  <span className="ref-flower-step-body">
                    Посадите <strong>{s.seed}</strong>
                    <img src={seedIcon(s.seed)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
                    {s.seedFlower != null && (
                      <span className="ref-price-hint">
                        {' '}(<CoinsIcon /> ≈ <FlowerAmount compact value={s.seedFlower} />)
                      </span>
                    )}{' '}
                    и скрестите с{' '}
                    <span className="ref-bait-ing">
                      <img src={ingredientIcon(s.ingredient)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
                      <strong>{s.amount > 1 ? `${s.amount}× ` : ''}{s.ingredient}</strong>
                      {s.isFlower && <span className="ref-price-hint"> (цветок из шага {i})</span>}
                      {!s.isFlower && s.ingredientTotal != null && (
                        <span className="ref-price-hint"> <FlowerAmount compact value={s.ingredientTotal} /></span>
                      )}
                    </span>
                    {' → '}
                    <img src={flowerIcon(s.flower)} alt="" className="ref-fish-icon" style={{ width: 18, height: 18 }} />
                    <strong>{s.flower}</strong>
                    <span className="ref-price-hint"> · растёт {formatDays(s.days)}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="ref-flower-totals">
              Всего по цепочке: <strong>{formatDays(plan.days)}</strong> · на посадки уйдёт <strong>≈ <FlowerAmount compact value={chain} /></strong>
              {steps.length > 1 && ' (по одной посадке каждого шага)'}.{' '}
              <span className="ref-price-hint">
                Себестоимость одного цветка с учётом выхода ≈ <FlowerAmount compact value={plan.cost} />.
              </span>
            </p>

            {alternatives.length > 0 && (
              <div className="ref-flower-alts">
                <span className="ref-price-hint">Другие варианты:</span>
                {alternatives.map((a) => (
                  <button key={a.modes.join()} type="button" className="ref-flower-alt" onClick={() => setMode(a.modes[0])}>
                    {a.modes.map((m) => MODE_ICON[m]).join('')} {a.modes.map((m, i) => { const l = MODES.find((x) => x.key === m)!.label; return i === 0 ? l : l.toLowerCase(); }).join(' и ')}: <Summary plan={a.plan} />
                  </button>
                ))}
              </div>
            )}
            {options.length > 1 && alternatives.length === 0 && (
              <p className="ref-price-hint">Для этого цветка один рецепт одновременно самый дешёвый и самый быстрый.</p>
            )}
          </div>
        )}
      </div>
    </BoostPanel>
  );
}
