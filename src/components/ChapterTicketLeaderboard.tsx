import { useEffect, useState } from 'react';
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

export default function ChapterTicketLeaderboard() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [expanded, setExpanded] = useState(false);
  const [showDropped, setShowDropped] = useState(false);

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

  if (state.status === 'loading') {
    return <div className="ctl-root"><div className="ctl-loading">Загрузка лидерборда…</div></div>;
  }
  if (state.status === 'error') {
    return <div className="ctl-root"><div className="ctl-loading">Не удалось загрузить лидерборд билетов.</div></div>;
  }

  const { leaderboard, dropped, fallen, updated_at, chapter_name } = state.data;
  if (leaderboard.length === 0) {
    return <div className="ctl-root"><div className="ctl-loading">Данные лидерборда пока не собраны.</div></div>;
  }

  const visible = expanded ? leaderboard : leaderboard.slice(0, INITIAL_ROWS);
  const updatedLabel = updated_at
    ? new Date(updated_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

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

      {(dropped.length > 0 || fallen.length > 0) && (
        <div className="ctl-changes">
          <button type="button" className="ctl-changes-toggle" onClick={() => setShowDropped((v) => !v)}>
            <span className={`ctl-changes-arrow${showDropped ? ' open' : ''}`}>▸</span>
            🔻 Динамика за сутки: выбыли из топа — {dropped.length}, просели — {fallen.length}
          </button>
          {showDropped && (
            <div className="ctl-changes-body">
              {dropped.length > 0 && (
                <>
                  <div className="ctl-changes-caption">Выбыли из топ-500:</div>
                  {dropped.map((d) => (
                    <div key={d.farm_id} className="ctl-change-row">
                      <span className="ctl-change-rank">#{d.old_rank} → вне топа</span>
                      <span className="ctl-name">{displayName(d.username, d.farm_id)}</span>
                      <span className="ctl-change-note">{d.old_tickets} 🎫</span>
                    </div>
                  ))}
                </>
              )}
              {fallen.length > 0 && (
                <>
                  <div className="ctl-changes-caption">Сильно просели (≥50 позиций):</div>
                  {fallen.map((f) => (
                    <div key={f.farm_id} className="ctl-change-row">
                      <span className="ctl-change-rank">#{f.old_rank} → #{f.rank}</span>
                      <span className="ctl-name">{displayName(f.username, f.farm_id)}</span>
                      <span className="ctl-change-note">{f.tickets} 🎫</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
