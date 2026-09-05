import { useEffect, useMemo, useRef, useState } from 'react';

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

function timezoneLabel() {
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const utc = minutes ? `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}` : `UTC${sign}${hours}`;
  return `по вашему местному времени (${utc})`;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_LABELS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

// value: "YYYY-MM-DDTHH:mm" (то же представление, что отдавал datetime-local)
function DateTimePicker({ value, onChange, disabled }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedDate = value ? new Date(value) : null;
  const [viewYear, setViewYear] = useState(() => (selectedDate ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selectedDate ?? new Date()).getMonth());
  const [hour, setHour] = useState(() => pad2(selectedDate ? selectedDate.getHours() : 12));
  const [minute, setMinute] = useState(() => pad2(selectedDate ? selectedDate.getMinutes() : 0));

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function openPicker() {
    if (disabled) return;
    const base = selectedDate ?? new Date();
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setHour(pad2(selectedDate ? selectedDate.getHours() : 12));
    setMinute(pad2(selectedDate ? selectedDate.getMinutes() : 0));
    setOpen(true);
  }

  function commit(day) {
    const iso = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}T${hour}:${minute}`;
    onChange(iso);
    setOpen(false);
  }

  function shiftMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // getDay(): 0=вс..6=сб -> сдвигаем на пн-старт недели
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();

  const label = selectedDate
    ? `${pad2(selectedDate.getDate())}.${pad2(selectedDate.getMonth() + 1)}.${selectedDate.getFullYear()} ${pad2(selectedDate.getHours())}:${pad2(selectedDate.getMinutes())}`
    : 'Выбрать дату и время';

  return (
    <div className="gc-datepicker" ref={rootRef}>
      <button
        type="button"
        className={`gc-datepicker-trigger${value ? ' gc-datepicker-trigger--filled' : ''}`}
        onClick={openPicker}
        disabled={disabled}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.5 1.5V4M10.5 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="gc-datepicker-pop gc-card">
          <div className="gc-datepicker-nav">
            <button type="button" className="gc-datepicker-nav-btn" onClick={() => shiftMonth(-1)} aria-label="Предыдущий месяц">‹</button>
            <span className="gc-datepicker-nav-label">{MONTH_LABELS[viewMonth]} {viewYear}</span>
            <button type="button" className="gc-datepicker-nav-btn" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">›</button>
          </div>

          <div className="gc-datepicker-weekdays">
            {WEEKDAY_LABELS.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="gc-datepicker-grid">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`blank-${i}`} className="gc-datepicker-day gc-datepicker-day--blank" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDate
                && selectedDate.getFullYear() === viewYear
                && selectedDate.getMonth() === viewMonth
                && selectedDate.getDate() === day;
              const isToday = today.getFullYear() === viewYear
                && today.getMonth() === viewMonth
                && today.getDate() === day;
              return (
                <button
                  type="button"
                  key={day}
                  className={`gc-datepicker-day${isSelected ? ' gc-datepicker-day--selected' : ''}${isToday && !isSelected ? ' gc-datepicker-day--today' : ''}`}
                  onClick={() => commit(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="gc-datepicker-time">
            <span className="gc-datepicker-time-label">Время</span>
            <input
              type="number"
              className="gc-datepicker-time-input"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(pad2(Math.max(0, Math.min(23, Number(e.target.value) || 0))))}
            />
            <span>:</span>
            <input
              type="number"
              className="gc-datepicker-time-input"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(pad2(Math.max(0, Math.min(59, Number(e.target.value) || 0))))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TicketsLeaderboardPage({ initialLeaderboard = [], initialUpdatedAt }) {
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [compareLeaderboard, setCompareLeaderboard] = useState(null);
  const [activePreset, setActivePreset] = useState('now');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const prevEntryByFarmId = useMemo(() => {
    if (!compareLeaderboard) return null;
    const map = new Map();
    for (const entry of compareLeaderboard) map.set(entry.farm_id, entry);
    return map;
  }, [compareLeaderboard]);

  const filteredLeaderboard = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leaderboard;
    return leaderboard.filter((entry) => {
      const name = entry.game_username ?? `Ферма #${entry.farm_id}`;
      return name.toLowerCase().includes(query);
    });
  }, [leaderboard, search]);

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
          <DateTimePicker
            value={customDate}
            onChange={selectCustomDate}
            disabled={loading}
          />
          <span className="gc-tickets-tz-hint">{timezoneLabel()}</span>
        </div>
        {compareLeaderboard && updated && (
          <div className="gc-tickets-history-hint">
            Столбец «Было» показывает место и тикеты на выбранную дату, «Изменение» — разницу мест относительно текущего снэпшота от {updated.absolute}.
          </div>
        )}
      </div>

      {error && (
        <div className="gc-community-error gc-card">
          ⚠️ Не удалось загрузить снэпшот. Попробуйте позже.
        </div>
      )}

      <div className="gc-tickets-search">
        <svg className="gc-tickets-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="gc-tickets-search-input"
          placeholder="Поиск игрока по имени…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="gc-tickets-search-clear"
            onClick={() => setSearch('')}
            aria-label="Очистить поиск"
          >
            ✕
          </button>
        )}
      </div>

      <div className="gc-lp-table gc-card" style={loading ? { opacity: 0.5, pointerEvents: 'none' } : undefined}>
        <div className={`gc-lp-row gc-lp-row-head gc-tickets-row${compareLeaderboard ? ' gc-tickets-row--compare' : ''}`}>
          <span className="gc-lp-col-rank">#</span>
          <span className="gc-lp-col-owner">Игрок</span>
          <span className="gc-lp-col-value">Тикеты</span>
          {compareLeaderboard && <span className="gc-lp-col-was">Было</span>}
          <span className="gc-lp-col-change">Изменение</span>
        </div>
        {filteredLeaderboard.length === 0 && (
          <div className="gc-tickets-no-results">Игроки не найдены</div>
        )}
        {filteredLeaderboard.map((entry) => {
          const prevEntry = compareLeaderboard ? prevEntryByFarmId.get(entry.farm_id) : null;
          return (
            <div className={`gc-lp-row gc-tickets-row${compareLeaderboard ? ' gc-tickets-row--compare' : ''}`} key={entry.farm_id}>
              <span className="gc-lp-col-rank">{entry.rank}</span>
              <span className="gc-lp-col-owner" title={entry.game_username ?? `Ферма #${entry.farm_id}`}>
                {entry.game_username ?? `Ферма #${entry.farm_id}`}
              </span>
              <span className="gc-lp-col-value">{fmtNum(entry.tickets)}</span>
              {compareLeaderboard && (
                <span className="gc-lp-col-was">
                  {prevEntry ? `#${prevEntry.rank} • ${fmtNum(prevEntry.tickets)}` : '—'}
                </span>
              )}
              <span className="gc-lp-col-change">
                {compareLeaderboard ? (
                  <RankChange rank={entry.rank} prevRank={prevEntry?.rank} />
                ) : (
                  <span className="gc-lp-rank-badge gc-lp-rank-same">—</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
