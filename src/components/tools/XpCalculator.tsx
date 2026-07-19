import { useState } from 'react';
import NumberStepper from '../NumberStepper';
import {
  PRE_ASCENSION_MAX_LEVEL,
  LEVELS_PER_ASCENSION,
  levelForXp,
  xpForLevel,
  ascensionBaseline,
  ascensionCumulativeAtLevel,
  ascensionStandingForXp,
} from '../../lib/bumpkinXp';

function fmt(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
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

export default function XpCalculator() {
  const [experience, setExperience] = useState(0);
  const [ascensionsDone, setAscensionsDone] = useState(0);
  const [target, setTarget] = useState<Target>({ kind: 'level', level: PRE_ASCENSION_MAX_LEVEL });

  const hasAscended = ascensionsDone >= 1;

  // Текущее положение.
  const current = hasAscended
    ? ascensionStandingForXp(experience, ascensionsDone)
    : (() => {
        const level = levelForXp(experience);
        const currentLevelXp = xpForLevel(level);
        const nextLevelXp = level >= PRE_ASCENSION_MAX_LEVEL ? currentLevelXp : xpForLevel(level + 1);
        return {
          level,
          currentProgress: experience - currentLevelXp,
          experienceToNextLevel: nextLevelXp - currentLevelXp,
        };
      })();

  // Требуемый опыт для выбранной цели (в абсолютных величинах game.bumpkin.experience).
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

  return (
    <div className="gc-calc">
      <div className="gc-calc-card gc-exp-params">
        <h2 className="gc-calc-h2">Параметры</h2>

        <label className="gc-calc-field">
          <span>Текущий опыт (game.bumpkin.experience)</span>
          <input
            type="number"
            min={0}
            value={experience}
            onChange={(e) => setExperience(Math.max(0, Number(e.target.value)))}
          />
        </label>

        <label className="gc-calc-field">
          <span>Сколько раз уже проходил Возвышение</span>
          <NumberStepper value={ascensionsDone} onChange={setAscensionsDone} min={0} max={50} />
          <small>0 — ещё ни разу не возвышался, уровень считается по обычной таблице до 150.</small>
        </label>

        <TargetPicker value={target} onChange={setTarget} allowLevel={!hasAscended} />

        <p className="gc-calc-note">
          После {PRE_ASCENSION_MAX_LEVEL}-го уровня прогресс определяется не только опытом, но и
          числом пройденных Возвышений — игра сбрасывает уровень и переоткрывает 12 расширений
          заново на каждом Возвышении. Если ты уже возвышался хотя бы раз, обычная шкала уровней
          (1–{PRE_ASCENSION_MAX_LEVEL}) больше не действует — выбирай цель по Возвышению.
        </p>
      </div>

      <div className="gc-calc-card">
        <div className="gc-exp-results-grid">
          <div>
            <h2 className="gc-calc-h2">Текущий прогресс</h2>
            <div className="gc-calc-table-wrap">
              <table className="gc-calc-table">
                <tbody>
                  <tr>
                    <td>{hasAscended ? `Возвышение №${ascensionsDone}, уровень` : 'Уровень'}</td>
                    <td className="gc-calc-num">{current.level}</td>
                  </tr>
                  <tr>
                    <td>Опыт до следующего уровня</td>
                    <td className="gc-calc-num">
                      {current.level >= (hasAscended ? LEVELS_PER_ASCENSION : PRE_ASCENSION_MAX_LEVEL)
                        ? '—'
                        : fmt(Math.max(0, current.experienceToNextLevel - current.currentProgress))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="gc-xp-progress-bar">
              <div className="gc-xp-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="gc-exp-kpi-col">
            <div className="gc-calc-kpi">
              <div className="gc-calc-kpi-label">Опыт нужно для цели</div>
              <div className="gc-calc-kpi-value">{fmt(targetXp)}</div>
            </div>
            <div className="gc-calc-kpi">
              <div className="gc-calc-kpi-label">Осталось набрать</div>
              <div className="gc-calc-kpi-value">{alreadyThere ? 'Уже там!' : fmt(remaining)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
