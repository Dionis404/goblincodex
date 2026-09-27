import { useEffect, useMemo, useRef, useState } from 'react';
import type { PriceResource, PricePoint } from '../lib/priceApi';
import './PriceHistory.css';

interface Props {
  resources: PriceResource[];
  initialItemKey?: string;
}

const RANGE_OPTIONS = [
  { hours: 24, label: '24 часа' },
  { hours: 24 * 7, label: '7 дней' },
  { hours: 24 * 30, label: '30 дней' },
  { hours: 2160, label: '90 дней' },
];

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; points: PricePoint[] };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 4 });
}

/** Лёгкий SVG-график floor-цены во времени — без сторонних зависимостей. */
function PriceChart({ points }: { points: PricePoint[] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 12, right: 12, bottom: 24, left: 48 };

  const series = useMemo(
    () => points
      .map(p => ({ t: new Date(p.captured_at).getTime(), v: p.floor ?? p.latest_sale }))
      .filter((p): p is { t: number; v: number } => p.v != null),
    [points],
  );

  if (series.length < 2) {
    return <div className="ph-chart-empty">Недостаточно точек для графика — попробуйте более широкий диапазон.</div>;
  }

  const minT = series[0].t;
  const maxT = series[series.length - 1].t;
  const minV = Math.min(...series.map(p => p.v));
  const maxV = Math.max(...series.map(p => p.v));
  const spanT = Math.max(maxT - minT, 1);
  const spanV = Math.max(maxV - minV, 0.0001);

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const x = (t: number) => padding.left + ((t - minT) / spanT) * innerW;
  const y = (v: number) => padding.top + innerH - ((v - minV) / spanV) * innerH;

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${x(series[series.length - 1].t).toFixed(1)} ${(height - padding.bottom).toFixed(1)} L ${x(series[0].t).toFixed(1)} ${(height - padding.bottom).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="ph-chart-svg" preserveAspectRatio="none">
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} className="ph-axis" />
      <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="ph-axis" />
      <text x={4} y={padding.top + 4} className="ph-axis-label">{formatPrice(maxV)}</text>
      <text x={4} y={height - padding.bottom} className="ph-axis-label">{formatPrice(minV)}</text>
      <path d={areaPath} className="ph-area" />
      <path d={linePath} className="ph-line" />
    </svg>
  );
}

export default function PriceHistory({ resources, initialItemKey }: Props) {
  const [itemKey, setItemKey] = useState(initialItemKey ?? resources[0]?.item_key ?? '');
  const [hours, setHours] = useState(RANGE_OPTIONS[2].hours);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<FetchState>({ status: 'idle' });
  const requestId = useRef(0);

  const filteredResources = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return resources;
    return resources.filter(r => r.item_name.toLowerCase().includes(q));
  }, [resources, search]);

  useEffect(() => {
    if (!itemKey) return;
    const id = ++requestId.current;
    setState({ status: 'loading' });
    fetch(`/api/prices/${encodeURIComponent(itemKey)}/history.json?hours=${hours}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ points: PricePoint[] }>;
      })
      .then(data => {
        if (requestId.current !== id) return;
        setState({ status: 'ready', points: data.points });
      })
      .catch(() => {
        if (requestId.current !== id) return;
        setState({ status: 'error' });
      });
  }, [itemKey, hours]);

  const selectedName = resources.find(r => r.item_key === itemKey)?.item_name ?? itemKey;

  return (
    <div className="ph-root">
      <div className="ph-panel">
        <div className="ph-toolbar">
          <div className="ph-search-wrap">
            <input
              type="text"
              className="ph-search"
              placeholder="Найти предмет..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <select className="ph-select" value={itemKey} onChange={e => setItemKey(e.target.value)}>
            {filteredResources.map(r => (
              <option key={r.item_key} value={r.item_key}>{r.item_name}</option>
            ))}
          </select>
        </div>

        <div className="ph-toolbar">
          <div className="ph-segmented">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.hours}
                type="button"
                className={`ph-segment${hours === opt.hours ? ' active' : ''}`}
                onClick={() => setHours(opt.hours)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ph-card">
        <div className="ph-card-title">{selectedName}</div>

        {state.status === 'loading' && <div className="ph-status">Загрузка истории...</div>}
        {state.status === 'error' && <div className="ph-status ph-status--error">Не удалось загрузить историю цены.</div>}
        {state.status === 'ready' && state.points.length === 0 && (
          <div className="ph-status">История цены за этот период не найдена — предмет мог не торговаться.</div>
        )}
        {state.status === 'ready' && state.points.length > 0 && (
          <>
            <PriceChart points={state.points} />

            <div className="ph-table-wrap">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Floor</th>
                    <th>Low</th>
                    <th>High</th>
                    <th>Последняя продажа</th>
                    <th>Объём</th>
                    <th>Сделок</th>
                  </tr>
                </thead>
                <tbody>
                  {[...state.points].reverse().map(p => (
                    <tr key={p.captured_at}>
                      <td>{formatDate(p.captured_at)}</td>
                      <td>{formatPrice(p.floor)}</td>
                      <td>{formatPrice(p.low)}</td>
                      <td>{formatPrice(p.high)}</td>
                      <td>{formatPrice(p.latest_sale)}</td>
                      <td>{formatPrice(p.volume)}</td>
                      <td>{p.trades ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
