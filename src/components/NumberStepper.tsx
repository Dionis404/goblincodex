import './NumberStepper.css';

/**
 * Замена голому <input type="number"> для полей с чёткими границами (например,
 * "уровень 1–50") — свои кнопки +/- вместо неснимаемых браузерных стрелочек
 * (см. global.css: у обычных number-инпутов они просто скрыты).
 */
export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  function clamp(n: number): number {
    return Math.min(max, Math.max(min, n));
  }

  return (
    <div className="gc-stepper">
      <button
        type="button"
        className="gc-stepper-btn"
        aria-label="Уменьшить"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        type="number"
        className="gc-stepper-input"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
      />
      <button
        type="button"
        className="gc-stepper-btn"
        aria-label="Увеличить"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
