import { useMemo, useState } from 'react';
import {
  calculate,
  RESOURCES,
  RESOURCE_LABELS,
  DEFAULT_YIELDS,
  FALLBACK_PRICES,
  type Resource,
  type Skills,
} from '../../lib/mining';

type Prices = Record<Resource, number>;
type Yields = Record<Resource, number>;

/** Форматирование чисел: целые без дробей, дробные — с фиксированной точностью. */
function fmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return value.toLocaleString('ru-RU');
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function MiningCalculator() {
  const [prices, setPrices] = useState<Prices>({ ...FALLBACK_PRICES });

  const [yields, setYields] = useState<Yields>({ ...DEFAULT_YIELDS });
  const [skills, setSkills] = useState<Skills>({
    fellerDiscount: false,
    frugalMiner: false,
  });
  const [coinRate, setCoinRate] = useState(1000);
  const [p2pFee, setP2pFee] = useState(0.1); // 10% по умолчанию

  const results = useMemo(
    () => calculate({ prices, yields, skills, coinRate, p2pFee }),
    [prices, yields, skills, coinRate, p2pFee]
  );

  const profitableCount = results.filter((r) => r.profitable).length;
  const best = results.reduce<typeof results[number] | null>(
    (acc, r) => (acc === null || r.profitPerUnit > acc.profitPerUnit ? r : acc),
    null
  );

  return (
    <div className="gc-calc">
      <div className="gc-calc-grid">
        {/* ── Левая колонка: параметры ── */}
        <div className="gc-calc-card">
          <h2 className="gc-calc-h2">Параметры</h2>

          <fieldset className="gc-calc-fieldset">
            <legend>Цены ресурсов (FLOWER)</legend>
            {RESOURCES.map((r) => (
              <label key={r} className="gc-calc-field gc-calc-field-row">
                <span>{RESOURCE_LABELS[r]}</span>
                <input
                  type="number"
                  min={0}
                  step={0.0001}
                  value={prices[r]}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, [r]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
            <button
              className="gc-btn gc-btn-secondary"
              onClick={() => setPrices({ ...FALLBACK_PRICES })}
            >
              Сбросить цены
            </button>
            <small>Введите актуальные цены вручную, например с P2P-рынка.</small>
          </fieldset>

          <fieldset className="gc-calc-fieldset">
            <legend>Скиллы скидок</legend>
            <label className="gc-calc-check">
              <input
                type="checkbox"
                checked={skills.fellerDiscount}
                onChange={(e) => setSkills((s) => ({ ...s, fellerDiscount: e.target.checked }))}
              />
              <span>Feller Discount — −20% на топоры</span>
            </label>
            <label className="gc-calc-check">
              <input
                type="checkbox"
                checked={skills.frugalMiner}
                onChange={(e) => setSkills((s) => ({ ...s, frugalMiner: e.target.checked }))}
              />
              <span>Frugal Miner — −20% на все кирки</span>
            </label>
          </fieldset>

          <label className="gc-calc-field">
            <span>Курс COIN к FLOWER</span>
            <input
              type="number"
              min={0.0001}
              step={1}
              value={coinRate}
              onChange={(e) => setCoinRate(Number(e.target.value))}
            />
            <small>Сколько COIN стоит 1 FLOWER (по умолчанию 1000)</small>
          </label>

          <label className="gc-calc-field">
            <span>Комиссия P2P-рынка</span>
            <select value={p2pFee} onChange={(e) => setP2pFee(Number(e.target.value))}>
              <option value={0}>0%</option>
              <option value={0.1}>10%</option>
              <option value={0.3}>30%</option>
            </select>
            <small>Вычитается из цены продажи</small>
          </label>

          <fieldset className="gc-calc-fieldset">
            <legend>Средний дроп с 1 инструмента</legend>
            {RESOURCES.map((r) => (
              <label key={r} className="gc-calc-field gc-calc-field-row">
                <span>{RESOURCE_LABELS[r]}</span>
                <input
                  type="number"
                  min={0.0001}
                  step={0.01}
                  value={yields[r]}
                  onChange={(e) =>
                    setYields((y) => ({ ...y, [r]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
            <button
              className="gc-btn gc-btn-secondary"
              onClick={() => setYields({ ...DEFAULT_YIELDS })}
            >
              Сбросить дроп
            </button>
          </fieldset>
        </div>

        {/* ── Правая колонка: результаты ── */}
        <div className="gc-calc-card">
          <div className="gc-calc-kpis">
            <div className="gc-calc-kpi">
              <div className="gc-calc-kpi-label">Выгодно продавать</div>
              <div className="gc-calc-kpi-value">{profitableCount}</div>
            </div>
            <div className="gc-calc-kpi">
              <div className="gc-calc-kpi-label">Лучший ресурс</div>
              <div className="gc-calc-kpi-value">{best?.resource ?? '—'}</div>
            </div>
            <div className="gc-calc-kpi">
              <div className="gc-calc-kpi-label">Лучший профит / ед.</div>
              <div className="gc-calc-kpi-value">
                {best ? fmt(best.profitPerUnit) : '—'}
              </div>
            </div>
          </div>

          <h2 className="gc-calc-h2">Результаты</h2>
          <div className="gc-calc-table-wrap">
            <table className="gc-calc-table">
              <thead>
                <tr>
                  <th>Ресурс</th>
                  <th>Продажа (чистая)</th>
                  <th>Себест. ед.</th>
                  <th>Профит / ед.</th>
                  <th>Профит / инстр.</th>
                  <th>Вывод</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.resource}>
                    <td>{r.resource}</td>
                    <td className="gc-calc-num">{fmt(r.netSellPrice)}</td>
                    <td className="gc-calc-num">{fmt(r.unitCost)}</td>
                    <td
                      className="gc-calc-num"
                      data-profit={r.profitable ? 'good' : 'bad'}
                    >
                      {fmt(r.profitPerUnit)}
                    </td>
                    <td className="gc-calc-num">{fmt(r.profitPerTool)}</td>
                    <td>
                      <span
                        className="gc-calc-badge"
                        data-profit={r.profitable ? 'good' : 'bad'}
                      >
                        {r.profitable ? 'Добывать' : 'Покупать'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gc-calc-note">
            Цены в FLOWER. «Профит / ед.» = чистая продажа минус себестоимость
            добычи. Себестоимость считается в режиме «рыночная база»: ингредиенты
            инструментов оцениваются по текущей рыночной цене.
          </p>
        </div>
      </div>
    </div>
  );
}
