import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Тиры бонуса по размеру депозита $FLOWER и логика недельного множителя —
 * портировано из неофициального калькулятора комьюнити (Xeko's Yakkamon
 * Deposit Calculator Sheet, реализация: kuro-txt.github.io/Yakkamon-deposit-point-calc).
 * Официальную формулу Yakkamon не публикует — это community-инструмент, не факт из docs.yakkamon.com.
 */
const TIERS = [
  { min: 0, rate: 0, label: 'Below Tier: < 50 FLOWER (0%)' },
  { min: 50, rate: 0.1, label: 'Tier 1: 50 – 499 FLOWER (10%)' },
  { min: 500, rate: 0.2, label: 'Tier 2: 500 – 4,999 FLOWER (20%)' },
  { min: 5000, rate: 0.4, label: 'Tier 3: 5,000 – 49,999 FLOWER (40%)' },
  { min: 50000, rate: 0.8, label: 'Tier 4: 50,000+ FLOWER (80%)' },
] as const;

/**
 * Первые два понедельника (17.08 и 24.08.2026) держат стартовый множитель 2.8x —
 * это разовая задержка перед началом снижения. С третьего понедельника (31.08)
 * шаг становится обычным недельным: -0.2 каждый следующий понедельник, до 1.0x.
 */
const MULTIPLIER_START = Date.UTC(2026, 7, 17); // 2026-08-17 — первый понедельник, 2.8x
const MULTIPLIER_START_HOLD_WEEKS = 1; // 17.08 и 24.08 обе на старте (0 и 1 неделя от старта)
const MULTIPLIER_START_VALUE = 2.8;
const MULTIPLIER_STEP = 0.2;
const MULTIPLIER_MIN = 1.0;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Текущий недельный множитель по дате — держит стартовое значение первые недели, потом -0.2 каждый понедельник. */
function currentMultiplier(now: number): number {
  const weeksPassed = Math.max(0, Math.floor((now - MULTIPLIER_START) / WEEK_MS));
  const stepsDone = Math.max(0, weeksPassed - MULTIPLIER_START_HOLD_WEEKS);
  const value = MULTIPLIER_START_VALUE - stepsDone * MULTIPLIER_STEP;
  return Math.max(MULTIPLIER_MIN, Math.round(value * 10) / 10);
}

function tierForAmount(amount: number): (typeof TIERS)[number] {
  let picked: (typeof TIERS)[number] = TIERS[0];
  for (const t of TIERS) {
    if (amount >= t.min) picked = t;
  }
  return picked;
}

function fmt(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CalculatorBody() {
  const [amountInput, setAmountInput] = useState('');
  const multiplier = currentMultiplier(Date.now());

  const amount = Math.max(0, Number(amountInput) || 0);
  const tier = tierForAmount(amount);
  // Формула из community-калькулятора: points = amount * (weeklyMultiplier + tierBonusRate)
  const points = amount * (multiplier + tier.rate);

  return (
    <div className="gc-calc">
      <div className="gc-calc-card gc-yk-calc-card">
        <label className="gc-calc-field">
          <span>Сумма депозита ($FLOWER)</span>
          <input
            type="number"
            min={0}
            step="any"
            placeholder="0"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
          />
        </label>

        <div className="gc-calc-kpis">
          <div className="gc-calc-kpi">
            <div className="gc-calc-kpi-label">Тир по сумме</div>
            <div className="gc-calc-kpi-value">{(tier.rate * 100).toFixed(0)}%</div>
          </div>
          <div className="gc-calc-kpi">
            <div className="gc-calc-kpi-label">Множитель этой недели</div>
            <div className="gc-calc-kpi-value">{multiplier.toFixed(1)}x</div>
          </div>
          <div className="gc-calc-kpi">
            <div className="gc-calc-kpi-label">Очков за депозит</div>
            <div className="gc-calc-kpi-value">{fmt(points)}</div>
          </div>
        </div>

        <p className="gc-calc-note">
          Тир подбирается автоматически по сумме: {tier.label}. Множитель стартует на{' '}
          {MULTIPLIER_START_VALUE.toFixed(1)}x с 17 августа 2026 и держится две недели (17 и 24
          августа), затем снижается на {MULTIPLIER_STEP.toFixed(1)} каждый следующий понедельник, до
          минимума {MULTIPLIER_MIN.toFixed(1)}x — чем раньше депозит, тем он выгоднее. Формула:{' '}
          <code>очки = сумма × (недельный множитель + бонус тира)</code>. Это неофициальный расчёт
          по community-калькулятору — Yakkamon не публикует точную формулу в docs, сверяйте с
          официальными источниками перед принятием решений.
        </p>
      </div>
    </div>
  );
}

function CalculatorModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal-box gc-yk-calc-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="gc-modal-close" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
        <div className="gc-card gc-yk-calc-modal-card">
          <h2 className="gc-yk-h3" style={{ marginTop: 0 }}>
            Калькулятор очков за депозит
          </h2>
          <CalculatorBody />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function YakkamonPointsCalculator() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="gc-btn-secondary" onClick={() => setOpen(true)}>
        🧮 Открыть калькулятор очков
      </button>
      {open && <CalculatorModal onClose={() => setOpen(false)} />}
    </>
  );
}
