import { useMemo, useState } from 'react';
import NumberStepper from '../NumberStepper';
import ResourceIcon, { CoinsIcon } from '../ResourceIcon';
import {
  buildStages,
  sumRange,
  formatDuration,
  islandRange,
  ISLAND_GROUPS_ORDER,
  ISLAND_GROUP_LABELS,
  EXPANSIONS_PER_ASCENSION,
  RESOURCE_LABELS,
  RESOURCE_ORDER,
  type IslandGroup,
  type Stage,
} from '../../lib/expansions';

function fmt(value: number): string {
  return value.toLocaleString('ru-RU');
}

type IslandChainGroup = Exclude<IslandGroup, 'ascension'>;

type Selection =
  | { kind: 'start' }
  | { kind: 'island'; island: IslandChainGroup; number: number }
  | { kind: 'ascension'; level: number; number: number };

function resolveIndex(sel: Selection, stages: Stage[]): number {
  if (sel.kind === 'start') return -1;
  if (sel.kind === 'island') {
    // "min - 1" — виртуальный пункт "ничего ещё не построено на этом острове":
    // индекс сразу перед первым расширением острова (для Базового это -1, т.е. "с нуля").
    if (sel.number === islandRange(sel.island).min - 1) {
      const firstIndex = stages.findIndex((s) => s.group === sel.island);
      return firstIndex - 1;
    }
    return stages.findIndex((s) => s.group === sel.island && s.number === sel.number);
  }
  // number === 0 — виртуальный пункт "уровень ещё не начат": индекс сразу перед
  // первым расширением этого уровня Возвышения (для уровня 1 это конец Вулкана).
  if (sel.number === 0) {
    const firstIndex = stages.findIndex((s) => s.id === `ascension-${sel.level}-1`);
    return firstIndex - 1;
  }
  return stages.findIndex((s) => s.id === `ascension-${sel.level}-${sel.number}`);
}

function rangeOptions(min: number, max: number): number[] {
  const opts: number[] = [];
  for (let n = min; n <= max; n++) opts.push(n);
  return opts;
}

/** Две формы выбора: остров (Базовый/Лепестковый рай/Пустыня/Вулкан) или Возвышение — вместо одного гигантского списка. */
function StagePicker({
  label,
  value,
  onChange,
  allowStart,
}: {
  label: string;
  value: Selection;
  onChange: (v: Selection) => void;
  allowStart?: boolean;
}) {
  const mode: 'start' | 'island' | 'ascension' = value.kind;

  const island = value.kind === 'island' ? value.island : 'basic';
  const islandNumber =
    value.kind === 'island' ? value.number : islandRange('basic').min - (allowStart ? 1 : 0);
  const ascensionLevel = value.kind === 'ascension' ? value.level : 1;
  const ascensionNumber = value.kind === 'ascension' ? value.number : (allowStart ? 0 : 1);

  function switchMode(next: 'start' | 'island' | 'ascension') {
    if (next === 'start') onChange({ kind: 'start' });
    else if (next === 'island') onChange({ kind: 'island', island, number: islandNumber });
    else onChange({ kind: 'ascension', level: ascensionLevel, number: ascensionNumber });
  }

  return (
    <div className="gc-calc-field gc-exp-picker">
      <span>{label}</span>
      <div className="gc-exp-picker-tabs">
        {allowStart && (
          <button
            type="button"
            className="gc-exp-picker-tab"
            data-active={mode === 'start'}
            onClick={() => switchMode('start')}
          >
            С нуля
          </button>
        )}
        <button
          type="button"
          className="gc-exp-picker-tab"
          data-active={mode === 'island'}
          onClick={() => switchMode('island')}
        >
          Базовый / Лепестковый рай / Пустыня / Вулкан
        </button>
        <button
          type="button"
          className="gc-exp-picker-tab"
          data-active={mode === 'ascension'}
          onClick={() => switchMode('ascension')}
        >
          Возвышение
        </button>
      </div>

      {mode === 'island' && (
        <div className="gc-exp-picker-row">
          <select
            value={island}
            onChange={(e) => {
              const g = e.target.value as IslandChainGroup;
              const defaultNumber = allowStart ? islandRange(g).min - 1 : islandRange(g).min;
              onChange({ kind: 'island', island: g, number: defaultNumber });
            }}
          >
            {ISLAND_GROUPS_ORDER.map((g) => (
              <option key={g} value={g}>
                {ISLAND_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
          <select
            value={islandNumber}
            onChange={(e) => onChange({ kind: 'island', island, number: Number(e.target.value) })}
          >
            {allowStart && (
              <option value={islandRange(island).min - 1}>
                №{islandRange(island).min - 1} (стартовая позиция)
              </option>
            )}
            {rangeOptions(islandRange(island).min, islandRange(island).max).map((n) => (
              <option key={n} value={n}>
                №{n}
              </option>
            ))}
          </select>
        </div>
      )}

      {mode === 'ascension' && (
        <div className="gc-exp-picker-row">
          <label className="gc-exp-picker-inline">
            <span>Уровень</span>
            <NumberStepper
              value={ascensionLevel}
              onChange={(level) => onChange({ kind: 'ascension', level, number: ascensionNumber })}
              min={1}
              max={50}
            />
          </label>
          <select
            value={ascensionNumber}
            onChange={(e) =>
              onChange({ kind: 'ascension', level: ascensionLevel, number: Number(e.target.value) })
            }
          >
            {allowStart && (
              <option value={0}>№0/{EXPANSIONS_PER_ASCENSION} (стартовая позиция)</option>
            )}
            {rangeOptions(1, EXPANSIONS_PER_ASCENSION).map((n) => (
              <option key={n} value={n}>
                №{n}/{EXPANSIONS_PER_ASCENSION}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default function ExpansionCalculator() {
  const [from, setFrom] = useState<Selection>({ kind: 'start' });
  const [to, setTo] = useState<Selection>({ kind: 'island', island: 'volcano', number: 30 });

  // Из Возвышения нельзя вернуться на остров — если "У меня есть" переключают
  // на Возвышение, "Хочу дойти до" следует за ним на следующий шаг того же уровня.
  function handleFromChange(next: Selection) {
    setFrom(next);
    if (next.kind === 'ascension' && to.kind !== 'ascension') {
      setTo(
        next.number >= EXPANSIONS_PER_ASCENSION
          ? { kind: 'ascension', level: next.level + 1, number: EXPANSIONS_PER_ASCENSION }
          : { kind: 'ascension', level: next.level, number: next.number + 1 }
      );
    }
  }

  const maxAscensionLevel = Math.max(
    3,
    from.kind === 'ascension' ? from.level : 0,
    to.kind === 'ascension' ? to.level : 0
  );
  const stages = useMemo(() => buildStages(maxAscensionLevel), [maxAscensionLevel]);

  const fromIndex = resolveIndex(from, stages);
  const toIndex = resolveIndex(to, stages);

  const total = sumRange(stages, fromIndex, toIndex);
  const invalidRange = toIndex <= fromIndex;
  const requiredLevel = invalidRange ? 0 : stages[toIndex].cost.level;

  return (
    <div className="gc-calc">
      <div className="gc-calc-card gc-exp-params">
        <h2 className="gc-calc-h2">Параметры</h2>
        <div className="gc-exp-params-row">
          <StagePicker label="У меня сейчас есть" value={from} onChange={handleFromChange} allowStart />
          <StagePicker label="Хочу дойти до" value={to} onChange={setTo} />
        </div>
        <p className="gc-calc-note">
          Расширения №1–3 не в списке — стартовые участки, выдаются бесплатно при создании фермы.
          При переходе на новый остров несколько первых расширений уже открыты бесплатно
          (Лепестковый рай и Пустыня — 4, Вулкан — 5) — это и есть «стартовая позиция» в списке.
          Возвышение (Ascension) полностью сбрасывает ферму и заново отстраивает те же 12
          участков с более высокой стоимостью — при выборе нескольких уровней сумма считается
          именно так, последовательно. «Стартовая позиция» (№0/12) — это начало уровня, когда
          ещё ничего не построено. Если диапазон пересекает границу острова или уровня
          Возвышения, в сумму автоматически добавляется стоимость самого перехода (действие
          «Апгрейд фермы») — она не входит в стоимость расширений и растёт отдельно.
        </p>
      </div>

      {invalidRange ? (
        <div className="gc-calc-card">
          <p className="gc-calc-note">
            Целевое расширение должно быть дальше того, что уже есть — выбери другой диапазон.
          </p>
        </div>
      ) : (
        <div className="gc-calc-card">
          <div className="gc-exp-results-grid">
            <div>
              <h2 className="gc-calc-h2">Итого ресурсов</h2>
              <div className="gc-calc-table-wrap">
                <table className="gc-calc-table">
                  <thead>
                    <tr>
                      <th>Ресурс</th>
                      <th>Количество</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="gc-calc-res-label">
                        <CoinsIcon />
                        Монеты (Coins)
                      </td>
                      <td className="gc-calc-num">
                        {fmt(total.coins)}
                        {total.transitionCoins > 0 && (
                          <span className="gc-calc-transition-note">
                            переход: {fmt(total.transitionCoins)}
                          </span>
                        )}
                      </td>
                    </tr>
                    {RESOURCE_ORDER.filter((r) => total.resources[r]).map((r) => (
                      <tr key={r}>
                        <td className="gc-calc-res-label">
                          <ResourceIcon resource={r} />
                          {RESOURCE_LABELS[r]}
                        </td>
                        <td className="gc-calc-num">
                          {fmt(total.resources[r]!)}
                          {total.transitionResources[r] ? (
                            <span className="gc-calc-transition-note">
                              переход: {fmt(total.transitionResources[r]!)}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total.transitionsCount > 0 && (
                <p className="gc-calc-note">
                  <span className="gc-calc-transition-swatch" /> Выделено — часть стоимости, которая
                  приходится на переход между островами/уровнями Возвышения, а не на сами расширения.
                </p>
              )}
            </div>

            <div className="gc-exp-kpi-col">
              <div className="gc-calc-kpi">
                <div className="gc-calc-kpi-label">Расширений в пути</div>
                <div className="gc-calc-kpi-value">{total.stagesCount}</div>
              </div>
              {total.transitionsCount > 0 && (
                <div className="gc-calc-kpi">
                  <div className="gc-calc-kpi-label">Переходов между островами</div>
                  <div className="gc-calc-kpi-value">{total.transitionsCount}</div>
                </div>
              )}
              <div className="gc-calc-kpi">
                <div className="gc-calc-kpi-label">Требуемый уровень</div>
                <div className="gc-calc-kpi-value">{requiredLevel}</div>
              </div>
              <div className="gc-calc-kpi">
                <div className="gc-calc-kpi-label">Суммарное время</div>
                <div className="gc-calc-kpi-value">{formatDuration(total.seconds)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
