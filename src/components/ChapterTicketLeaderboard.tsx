import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './ChapterTicketLeaderboard.css';

interface Win {
  item_name: string;
  currency: string; // "flower" | "gems" | ингредиент | "tickets"
  amount: number;
}

interface LeaderboardEntry {
  rank: number;
  farm_id: number;
  username: string | null;
  tickets: number;
  wins: Win[];
}

interface DroppedEntry {
  farm_id: number;
  username: string | null;
  old_rank: number;
  old_tickets: number;
}

interface FallenEntry {
  farm_id: number;
  username: string | null;
  old_rank: number;
  rank: number;
  tickets: number;
}

interface Payload {
  chapter_name: string | null;
  updated_at: string | null;
  leaderboard: LeaderboardEntry[];
  dropped: DroppedEntry[];
  fallen: FallenEntry[];
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: Payload };

const INITIAL_ROWS = 20;

// Иконки валют — те же спрайты игры, что в ChapterAuctions.
const CURRENCY_ICON: Record<string, string> = {
  flower: '/sprites/icons/flower_token.webp',
  gems: '/sprites/icons/gem.webp',
};

const CURRENCY_LABEL: Record<string, string> = {
  flower: 'Flower',
  gems: 'гемы',
  tickets: 'тикеты',
};

function displayName(username: string | null, farmId: number): string {
  return username || `Farm #${farmId}`;
}

function formatAmount(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function WinBadges({ wins }: { wins: Win[] }) {
  if (wins.length === 0) return null;
  // Один предмет мог быть выигран в нескольких дропах — схлопываем по имени.
  const byItem = new Map<string, { count: number; currencies: Set<string>; title: string[] }>();
  wins.forEach((w) => {
    const agg = byItem.get(w.item_name) ?? { count: 0, currencies: new Set<string>(), title: [] };
    agg.count += 1;
    agg.currencies.add(w.currency);
    agg.title.push(`${w.item_name} — ${formatAmount(w.amount)} ${CURRENCY_LABEL[w.currency] ?? w.currency}`);
    byItem.set(w.item_name, agg);
  });
  return (
    <span className="ctl-wins">
      {[...byItem.entries()].map(([item, agg]) => {
        const icon = CURRENCY_ICON[[...agg.currencies][0]];
        return (
          <span key={item} className="ctl-win" title={agg.title.join('\n')}>
            {icon && <img src={icon} alt="" className="ctl-win-icon" />}
            {item}{agg.count > 1 ? ` ×${agg.count}` : ''}
          </span>
        );
      })}
    </span>
  );
}

interface DayInfo {
  day: string; // YYYY-MM-DD (UTC)
  dropped: number;
  fallen: number;
}

type ArchiveState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; dropped: DroppedEntry[]; fallen: FallenEntry[] };

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', timeZone: 'UTC',
  });
}

export default function ChapterTicketLeaderboard() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [expanded, setExpanded] = useState(false);
  const [showDropped, setShowDropped] = useState(false);
  // Архив по дням: dayOffset 0 — живое окно «за 24 часа»; 1..N — дни архива.
  const [days, setDays] = useState<DayInfo[] | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [archive, setArchive] = useState<ArchiveState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/chapter-leaderboard.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Payload>;
      })
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  // Список дней архива подтягиваем при первом открытии модалки.
  useEffect(() => {
    if (!showDropped || days !== null) return;
    let cancelled = false;
    fetch('/api/top500-changes.json')
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: { days?: DayInfo[] }) => { if (!cancelled) setDays(data.days ?? []); })
      .catch(() => { if (!cancelled) setDays([]); });
    return () => { cancelled = true; };
  }, [showDropped, days]);

  // Архивный день — отдельный запрос.
  useEffect(() => {
    if (!showDropped || dayOffset === 0 || !days || days.length < dayOffset) return;
    const day = days[dayOffset - 1].day;
    let cancelled = false;
    setArchive({ status: 'loading' });
    fetch(`/api/top500-changes.json?day=${day}`)
      .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then((data: { dropped?: DroppedEntry[]; fallen?: FallenEntry[] }) => {
        if (!cancelled) setArchive({ status: 'ready', dropped: data.dropped ?? [], fallen: data.fallen ?? [] });
      })
      .catch(() => { if (!cancelled) setArchive({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [showDropped, dayOffset, days]);

  if (state.status === 'loading') {
    return <div className="ctl-root"><div className="ctl-loading">Загрузка лидерборда…</div></div>;
  }
  if (state.status === 'error') {
    return <div className="ctl-root"><div className="ctl-loading">Не удалось загрузить лидерборд билетов.</div></div>;
  }

  const { leaderboard, dropped, updated_at, chapter_name } = state.data;
  if (leaderboard.length === 0) {
    return <div className="ctl-root"><div className="ctl-loading">Данные лидерборда пока не собраны.</div></div>;
  }

  const visible = expanded ? leaderboard : leaderboard.slice(0, INITIAL_ROWS);
  const updatedLabel = updated_at
    ? new Date(updated_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  // Что показываем в модалке: живое окно (offset 0) или день из архива.
  const viewDropped = dayOffset === 0 ? dropped : archive.status === 'ready' ? archive.dropped : [];
  const modalTitle = dayOffset === 0
    ? 'За последние сутки'
    : days && days[dayOffset - 1] ? formatDayLabel(days[dayOffset - 1].day) : '…';

  const changesList = (dd: DroppedEntry[]) => (
    <>
      {dd.length === 0 && (
        <div className="ctl-changes-empty">Изменений в топе не зафиксировано.</div>
      )}
      {dd.length > 0 && (
        <>
          <div className="ctl-changes-caption">Выбыли из топ-500:</div>
          {dd.map((d) => (
            <div key={d.farm_id} className="ctl-change-row">
              <span className="ctl-change-rank">#{d.old_rank} → вне топа</span>
              <span className="ctl-name">{displayName(d.username, d.farm_id)}</span>
              <span className="ctl-change-note">{d.old_tickets} 🎫</span>
            </div>
          ))}
        </>
      )}
    </>
  );

  return (
    <div className="ctl-root">
      <div className="ctl-header">
        <span className="ctl-header-icon">🏆</span>
        <div>
          <div className="ctl-header-title">Лидерборд билетов</div>
          <div className="ctl-header-sub">
            Глава «{chapter_name ?? 'текущая'}»{updatedLabel ? ` · обновлено ${updatedLabel}` : ''}
          </div>
        </div>
        <button type="button" className="ctl-changes-btn" onClick={() => setShowDropped((v) => !v)}>
          🔻 Кто вышел{dropped.length > 0 ? ` (${dropped.length})` : ''}
        </button>
      </div>

      <div className="ctl-table">
        {visible.map((e) => (
          <div key={e.farm_id} className={`ctl-row${e.wins.length > 0 ? ' ctl-row--winner' : ''}`}>
            <span className="ctl-rank">#{e.rank}</span>
            <span className="ctl-name">{displayName(e.username, e.farm_id)}</span>
            <WinBadges wins={e.wins} />
            <span className="ctl-tickets">{e.tickets} 🎫</span>
          </div>
        ))}
      </div>

      {leaderboard.length > INITIAL_ROWS && (
        <button type="button" className="ctl-expand" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Свернуть' : `Показать все ${leaderboard.length}`}
        </button>
      )}

      {showDropped && createPortal(
        <div className="ctl-modal-overlay" onClick={() => setShowDropped(false)}>
          <div className="ctl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ctl-modal-head">
              <div className="ctl-modal-nav">
                <button
                  type="button"
                  className="ctl-modal-nav-btn"
                  disabled={!days || dayOffset >= days.length}
                  onClick={() => setDayOffset((o) => o + 1)}
                  aria-label="Предыдущий день"
                >
                  ‹
                </button>
                <span className="ctl-modal-title">🔻 {modalTitle}</span>
                <button
                  type="button"
                  className="ctl-modal-nav-btn"
                  disabled={dayOffset === 0}
                  onClick={() => setDayOffset((o) => o - 1)}
                  aria-label="Следующий день"
                >
                  ›
                </button>
              </div>
              <button type="button" className="ctl-modal-close" onClick={() => setShowDropped(false)} aria-label="Закрыть">✕</button>
            </div>
            <div className="ctl-changes-body">
              {dayOffset > 0 && archive.status === 'loading' && (
                <div className="ctl-changes-empty">Загрузка дня…</div>
              )}
              {dayOffset > 0 && archive.status === 'error' && (
                <div className="ctl-changes-empty">Не удалось загрузить архив за этот день.</div>
              )}
              {(dayOffset === 0 || archive.status === 'ready') && changesList(viewDropped)}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
