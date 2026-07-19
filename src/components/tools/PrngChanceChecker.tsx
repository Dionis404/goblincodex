import { useEffect, useMemo, useState } from 'react';
import { prngChance } from '../../lib/prng';
import NumberStepper from '../NumberStepper';
import {
  PRNG_MECHANICS,
  PRNG_RESOURCE_GROUPS,
  HARVEST_CROP_IDS,
  HARVEST_MECHANICS,
  type PrngMechanic,
  type PrngRequirement,
  type PrngResourceGroup,
} from '../../lib/prngMechanics';

const CROP_NAMES = Object.keys(HARVEST_CROP_IDS);
const GROUPS = Object.keys(PRNG_RESOURCE_GROUPS) as PrngResourceGroup[];

type ResolvedMechanic = PrngMechanic;

function buildHarvestMechanics(crop: string): ResolvedMechanic[] {
  return HARVEST_MECHANICS.filter((m) => !m.onlyForCrop || m.onlyForCrop === crop).map((m) => ({
    id: m.id,
    group: 'crop',
    label: m.label,
    itemId: HARVEST_CROP_IDS[crop],
    itemLabel: crop,
    counterKey: m.counterKey.replace('{crop}', crop),
    criticalHitName: m.criticalHitName.replace('{crop}', crop),
    defaultChance: m.defaultChance,
    effect: m.effect,
    requirement: m.requirement,
  }));
}

function requirementLabel(req: PrngRequirement): string {
  switch (req.kind) {
    case 'always':
      return 'Всегда доступно';
    case 'skill':
      return `Нужен изученный скилл «${req.name}»`;
    case 'collectible':
      return `Нужна постройка «${req.name}»`;
    case 'wearable':
      return `Нужен надетый предмет «${req.name}»`;
  }
}

function fmtChance(chance: number): string {
  if (Number.isInteger(chance)) return `${chance}%`;
  return `${chance.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

export default function PrngChanceChecker() {
  const [dbChances, setDbChances] = useState<Record<string, number>>({});

  const [group, setGroup] = useState<PrngResourceGroup>('gold');
  const [crop, setCrop] = useState(CROP_NAMES[0]);
  const [scanCount, setScanCount] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [farmId, setFarmId] = useState(1);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    fetch('/api/prng-chances.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then(setDbChances)
      .catch(() => setDbChances({}));
  }, []);

  const mechanics: ResolvedMechanic[] = useMemo(() => {
    if (group === 'crop') return buildHarvestMechanics(crop);
    return PRNG_MECHANICS.filter((m) => m.group === group);
  }, [group, crop]);

  return (
    <div className="gc-calc">
      <div className="gc-calc-card gc-prng-farm-card">
        <h2 className="gc-calc-h2">Входные данные</h2>
        <div className="gc-calc-field-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="gc-calc-field" style={{ margin: 0 }}>
            <span>Farm ID</span>
            <input
              type="number"
              min={0}
              value={farmId}
              onChange={(e) => setFarmId(Number(e.target.value))}
            />
          </label>
          <label className="gc-calc-field" style={{ margin: 0 }}>
            <span>Счётчик действия</span>
            <input
              type="number"
              min={0}
              value={counter}
              onChange={(e) => setCounter(Number(e.target.value))}
            />
          </label>
        </div>
        <small>
          Введи свой Farm ID и текущее значение счётчика действия (сколько раз это конкретное
          действие уже совершалось на ферме).
        </small>
        <label className="gc-calc-field">
          <span>Проверить на N действий вперёд</span>
          <NumberStepper value={scanCount} onChange={setScanCount} min={1} max={1000} step={10} />
        </label>
      </div>

      <div className="gc-prng-tabs">
        {GROUPS.map((g) => (
          <button
            key={g}
            className="gc-prng-tab"
            data-active={g === group}
            onClick={() => setGroup(g)}
          >
            {PRNG_RESOURCE_GROUPS[g]}
          </button>
        ))}
      </div>

      {group === 'crop' && (
        <label className="gc-calc-field" style={{ maxWidth: 260 }}>
          <span>Культура</span>
          <select value={crop} onChange={(e) => setCrop(e.target.value)}>
            {CROP_NAMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="gc-prng-mechanics">
        {mechanics.map((m) => {
          const chance = dbChances[m.criticalHitName] ?? m.defaultChance;
          const chanceSource = dbChances[m.criticalHitName] !== undefined ? 'БД' : 'код игры';

          const hit = prngChance({
            farmId,
            itemId: m.itemId,
            counter,
            chance,
            criticalHitName: m.criticalHitName,
          });

          const expanded = expandedId === m.id;

          // Всегда считаем (не только когда таблица раскрыта) — нужно для
          // сводки "X из N" в KPI, независимо от того, открыт ли список строк.
          const scanRows = Array.from({ length: scanCount }, (_, i) => {
            const c = counter + i;
            return {
              counter: c,
              hit: prngChance({
                farmId,
                itemId: m.itemId,
                counter: c,
                chance,
                criticalHitName: m.criticalHitName,
              }),
            };
          });
          const hitCount = scanRows.reduce((sum, r) => sum + (r.hit ? 1 : 0), 0);

          return (
            <div key={m.id} className="gc-calc-card gc-prng-mechanic-card">
              <div className="gc-prng-mechanic-head">
                <div>
                  <h3>{m.label}</h3>
                  <small>
                    {m.effect} · {requirementLabel(m.requirement)}
                  </small>
                </div>
              </div>

              <div className="gc-calc-kpis">
                <div className="gc-calc-kpi">
                  <div className="gc-calc-kpi-label">Шанс ({chanceSource})</div>
                  <div className="gc-calc-kpi-value">{fmtChance(chance)}</div>
                </div>
                <div className="gc-calc-kpi">
                  <div className="gc-calc-kpi-label">Счётчик</div>
                  <div className="gc-calc-kpi-value">{counter}</div>
                </div>
                <div className="gc-calc-kpi">
                  <div className="gc-calc-kpi-label">Сейчас</div>
                  <div className="gc-calc-kpi-value" data-profit={hit ? 'good' : 'bad'}>
                    {hit ? 'Сработает' : 'Нет'}
                  </div>
                </div>
                <div className="gc-calc-kpi">
                  <div className="gc-calc-kpi-label">За {scanCount} действий</div>
                  <div className="gc-calc-kpi-value" data-profit={hitCount > 0 ? 'good' : 'bad'}>
                    {hitCount} раз{hitCount === 1 ? '' : hitCount >= 2 && hitCount <= 4 ? 'а' : ''}
                  </div>
                </div>
              </div>
              <p className="gc-calc-note" style={{ margin: '0 0 10px' }}>
                Из {scanCount} следующих действий (счётчик {counter}–{counter + scanCount - 1})
                крит сработает <strong>{hitCount}</strong> раз ({fmtChance((hitCount / scanCount) * 100)} от N).
              </p>

              <button
                className="gc-btn gc-btn-secondary"
                onClick={() => setExpandedId(expanded ? null : m.id)}
              >
                {expanded ? 'Скрыть список действий' : 'Показать список по каждому действию'}
              </button>

              {expanded && (
                <div className="gc-calc-table-wrap" style={{ marginTop: 12 }}>
                  <table className="gc-calc-table">
                    <thead>
                      <tr>
                        <th>Счётчик</th>
                        <th>Результат</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scanRows.map((r) => (
                        <tr key={r.counter}>
                          <td>{r.counter}</td>
                          <td>
                            <span
                              className="gc-calc-badge"
                              data-profit={r.hit ? 'good' : 'bad'}
                            >
                              {r.hit ? 'Крит' : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="gc-calc-note">
        Игра использует не Math.random(), а детерминированный PRNG (32-битный
        MurmurHash3-подобный алгоритм), считающий результат из Farm ID, ID
        предмета/ресурса, счётчика действия и имени эффекта. При одинаковых
        входных данных результат всегда одинаковый. Проценты шанса — из нашей
        БД баффов (обновляется вместе с игрой), либо из проверенных значений
        в коде, если для эффекта нет отдельной записи в БД (Native, возврат
        семян).
      </p>
    </div>
  );
}
