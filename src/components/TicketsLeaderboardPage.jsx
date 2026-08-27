import { useMemo, useState } from 'react';

const fmtNum = (n) => n.toLocaleString('ru-RU');

function formatUpdatedAt(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  let relative;
  if (diffMin < 1) relative = 'только что';
  else if (diffMin < 60) relative = `${diffMin} мин назад`;
  else if (diffMin < 60 * 24) relative = `${Math.round(diffMin / 60)} ч назад`;
  else relative = `${Math.round(diffMin / (60 * 24))} дн назад`;

  const absolute = date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relative, absolute };
}

// Presets: how far back to look for the comparison snapshot
const PRESETS = [
  { key: 'now', label: 'Сейчас', hoursAgo: 0 },
  { key: '1d', label: '1 день назад', hoursAgo: 24 },
  { key: '1w', label: '1 неделя назад', hoursAgo: 24 * 7 },
  { key: '1m', label: '1 месяц назад', hoursAgo: 24 * 30 },
];

function RankChange({ rank, prevRank }) {
  if (prevRank == null) {
    return <span className="gc-lp-rank-badge gc-lp-rank-new">Новичок</span>;
  }
  const delta = prevRank - rank;
  if (delta > 0) {
    return <span className="gc-lp-rank-badge gc-lp-rank-up">▲ {delta}</span>;
  }
  if (delta < 0) {
    return <span className="gc-lp-rank-badge gc-lp-rank-down">▼ {Math.abs(delta)}</span>;
  }
  return <span className="gc-lp-rank-badge gc-lp-rank-same">—</span>;
}

export default function TicketsLeaderboardPage({ initialLeaderboard = [], initialUpdatedAt }) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [compareLeaderboard, setCompareLeaderboard] = useState(null);
  const [activePreset, setActivePreset] = useState('now');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const prevRankByFarmId = useMemo(() => {
    if (!compareLeaderboard) return null;
    const map = new Map();
    for (const entry of compareLeaderboard) map.set(entry.farm_id, entry.rank);
    return map;
  }, [compareLeaderboard]);

  async function fetchSnapshot(atIso) {
    const target = atIso
      ? `/api/tickets-leaderboard.json?at=${encodeURIComponent(atIso)}`
      : '/api/tickets-leaderboard.json';
    const res = await fetch(target);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function selectPreset(preset) {
    setActivePreset(preset.key);
    setCustomDate('');
    setError(false);

    if (preset.hoursAgo === 0) {
      setLoading(true);
      try {
        const json = await fetchSnapshot(null);
        setLeaderboard(json.leaderboard ?? []);
        setUpdatedAt(json.updated_at ?? null);
        setCompareLeaderboard(null);
      } catch (e) {
        console.error('Tickets leaderboard fetch error:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const atIso = new Date(Date.now() - preset.hoursAgo * 3600_000).toISOString();
      const [current, past] = await Promise.all([
        fetchSnapshot(null),
        fetchSnapshot(atIso),
      ]);
      setLeaderboard(current.leaderboard ?? []);
      setUpdatedAt(current.updated_at ?? null);
      setCompareLeaderboard(past.leaderboard ?? []);
    } catch (e) {
      console.error('Tickets leaderboard fetch error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function selectCustomDate(value) {
    setCustomDate(value);
    setActivePreset(null);
    setError(false);
    if (!value) return;

    setLoading(true);
    try {
      const atIso = new Date(value).toISOString();
      const [current, past] = await Promise.all([
        fetchSnapshot(null),
        fetchSnapshot(atIso),
      ]);
      setLeaderboard(current.leaderboard ?? []);
      setUpdatedAt(current.updated_at ?? null);
      setCompareLeaderboard(past.leaderboard ?? []);
    } catch (e) {
      console.error('Tickets leaderboard fetch error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const updated = updatedAt ? formatUpdatedAt(updatedAt) : null;

  if (!initialLeaderboard.length && !leaderboard.length) {
    return (
      <div className="gc-community-empty gc-card">
        <img className="gc-community-empty-icon" src="/sprites/icons/ticket.png" alt="" width="40" height="40" />
        <p className="gc-community-empty-text">
          Лидерборд пока пуст. Данные обновляются раз в час — загляните позже.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="gc-lp-meta gc-card">
        <div className="gc-lp-meta-stat">
          <div className="gc-lp-meta-val">{leaderboard.length}</div>
          <div className="gc-lp-meta-label">В борде</div>
        </div>
        {leaderboard[0] && (
          <div className="gc-lp-meta-stat">
            <div className="gc-lp-meta-val">{fmtNum(leaderboard[0].tickets)}</div>
            <div className="gc-lp-meta-label">Тикетов у #1</div>
          </div>
        )}
        {updated && (
          <div className="gc-lp-meta-stat">
            <div className="gc-lp-meta-val" title={updated.absolute}>{updated.relative}</div>
            <div className="gc-lp-meta-label">Снэпшот от</div>
          </div>
        )}
      </div>

      <div className="gc-tickets-history gc-card">
        <div className="gc-tickets-history-label">Сравнить с:</div>
        <div className="gc-tickets-history-presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              className={`gc-btn-secondary gc-tickets-preset-btn${activePreset === preset.key ? ' gc-tickets-preset-active' : ''}`}
              onClick={() => selectPreset(preset)}
              disabled={loading}
            >
              {preset.label}
            </button>
          ))}
          <input
            type="datetime-local"
            className="gc-tickets-date-input"
            value={customDate}
            onChange={(e) => selectCustomDate(e.target.value)}
            disabled={loading}
          />
        </div>
        {compareLeaderboard && updated && (
          <div className="gc-tickets-history-hint">
            Изменения рангов показаны относительно снэпшота на {updated.absolute} по сравнению с выбранной датой.
          </div>
        )}
      </div>

      {error && (
        <div className="gc-community-error gc-card">
          ⚠️ Не удалось загрузить снэпшот. Попробуйте позже.
        </div>
      )}

      <div className="gc-lp-table gc-card" style={loading ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
        <div className="gc-lp-row gc-lp-row-head">
          <span className="gc-lp-col-rank">#</span>
          <span className="gc-lp-col-owner">Игрок</span>
          <span className="gc-lp-col-value">Тикеты</span>
          <span className="gc-lp-col-change">Изменение</span>
        </div>
        {leaderboard.map((entry) => (
          <div className="gc-lp-row gc-tickets-row" key={entry.farm_id}>
            <span className="gc-lp-col-rank">{entry.rank}</span>
            <span className="gc-lp-col-owner" title={entry.game_username ?? `Ферма #${entry.farm_id}`}>
              {entry.game_username ?? `Ферма #${entry.farm_id}`}
            </span>
            <span className="gc-lp-col-value">{fmtNum(entry.tickets)}</span>
            <span className="gc-lp-col-change">
              {compareLeaderboard ? (
                <RankChange rank={entry.rank} prevRank={prevRankByFarmId.get(entry.farm_id)} />
              ) : (
                <span className="gc-lp-rank-badge gc-lp-rank-same">—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
