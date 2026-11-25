import { useMemo, useState } from 'react';

// Календарь аукционов главы: помесячная 7-колоночная сетка с переключением
// месяцев (глава обычно захватывает 2-3 месяца). В ячейке дня — по одному
// спрайту на предмет (повторы дропов одного предмета не дублируются).
// Клик по дню открывает список аукционов дня; клик по аукциону
// пробрасывается наверх (ChapterAuctions откроет модалку с результатами).

export interface CalendarAuction {
  auctionId: string;
  startAt: number;
  endAt: number;
  type: 'collectible' | 'wearable' | 'nft';
  collectible?: string;
  wearable?: string;
  nft?: string;
}

interface CatalogEntryLite {
  sprite: string | null;
}

interface Props {
  auctions: CalendarAuction[];
  catalog: Record<string, CatalogEntryLite>;
  /** Границы главы (мс) — месяцы листаются строго внутри них. */
  chapterStart: number;
  chapterEnd: number;
  now: number;
  onSelect: (a: CalendarAuction) => void;
}

const TYPE_ICON: Record<CalendarAuction['type'], string> = {
  collectible: '📦',
  wearable: '👕',
  nft: '🐾',
};

const NFT_SPRITES: Record<string, string> = { Pet: 'icons/pet_nft_egg.png' };

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MAX_SPRITES = 4;

function itemName(a: CalendarAuction): string {
  return a.collectible ?? a.wearable ?? a.nft ?? '—';
}

function itemSprite(a: CalendarAuction, catalog: Props['catalog']): string | null {
  return catalog[itemName(a)]?.sprite ?? (a.nft ? NFT_SPRITES[a.nft] : undefined) ?? null;
}

// Дни и месяцы считаем в МСК — как группировка списка (formatDay там тоже МСК).
const DAY_FMT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' });
const MONTH_FMT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', month: 'long', year: 'numeric' });

function dayKey(ms: number): string {
  return DAY_FMT.format(ms);
}

function dayStartMs(dayKeyStr: string): number {
  const [d, m, y] = dayKeyStr.split('.').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Ключ месяца "YYYY-MM" по московскому времени. */
function monthKey(ms: number): string {
  const [, m, y] = dayKey(ms).split('.').map(Number);
  return `${y}-${String(m).padStart(2, '0')}`;
}

function monthStartMs(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return Date.UTC(y, m - 1, 1);
}

export default function AuctionCalendar({ auctions, catalog, chapterStart, chapterEnd, now, onSelect }: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAuction[]>();
    auctions.forEach((a) => {
      const key = dayKey(a.startAt);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    });
    map.forEach((list) => list.sort((a, b) => a.startAt - b.startAt));
    return map;
  }, [auctions]);

  // Месяцы, которые накрывает глава (в МСК).
  const months = useMemo(() => {
    if (!chapterStart || !chapterEnd) return [];
    const out: string[] = [];
    const first = monthKey(chapterStart);
    const last = monthKey(chapterEnd - 1);
    let mk = first;
    while (mk <= last && out.length < 12) {
      out.push(mk);
      const [y, m] = mk.split('-').map(Number);
      mk = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return out;
  }, [chapterStart, chapterEnd]);

  // Текущий месяц по умолчанию, если он внутри главы; иначе первый месяц главы.
  const nowMonth = monthKey(now);
  const [monthCursor, setMonthCursor] = useState(() => (months.includes(nowMonth) ? nowMonth : months[0]));

  const cells = useMemo(() => {
    if (!monthCursor) return [];
    const first = monthStartMs(monthCursor);
    const [y, m] = monthCursor.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const leading = (new Date(first).getUTCDay() + 6) % 7; // пустые ячейки до Пн
    const out: ({ ms: number; inChapter: boolean; key: string } | null)[] = [];
    for (let i = 0; i < leading; i++) out.push(null);
    for (let d = 0; d < daysInMonth; d++) {
      const ms = first + d * 86_400_000;
      out.push({ ms, inChapter: ms >= dayStartMs(dayKey(chapterStart)) && ms <= dayStartMs(dayKey(chapterEnd - 1)), key: dayKey(ms) });
    }
    return out;
  }, [monthCursor, chapterStart, chapterEnd]);

  if (months.length === 0) {
    return <div className="cac-empty">Границы главы неизвестны — календарь не построить.</div>;
  }

  const todayKey = dayKey(now);
  const monthIdx = months.indexOf(monthCursor);
  const monthLabel = MONTH_FMT.format(monthStartMs(monthCursor));

  return (
    <div className="cac-root">
      <div className="cac-month-bar">
        <button
          type="button"
          className="cac-month-nav"
          disabled={monthIdx <= 0}
          onClick={() => setMonthCursor(months[monthIdx - 1])}
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <span className="cac-month-label">{monthLabel}</span>
        <button
          type="button"
          className="cac-month-nav"
          disabled={monthIdx >= months.length - 1}
          onClick={() => setMonthCursor(months[monthIdx + 1])}
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="cac-weekdays">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cac-grid">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} className="cac-cell cac-cell--blank" />;
          const dayAuctions = cell.inChapter ? byDay.get(cell.key) ?? [] : [];
          // Один спрайт на предмет — повторные дропы того же предмета в этот
          // день не плодим.
          const uniqueAuctions = [...new Map(dayAuctions.map((a) => [itemName(a), a])).values()];
          const isToday = cell.key === todayKey;
          const dayNum = Number(cell.key.split('.')[0]);
          const hasLive = dayAuctions.some((a) => now >= a.startAt && now < a.endAt);
          return (
            <div key={cell.ms} className="cac-cell-wrap">
              <button
                type="button"
                disabled={!cell.inChapter}
                className={[
                  'cac-cell',
                  cell.inChapter ? '' : 'cac-cell--outside',
                  dayAuctions.length > 0 ? 'cac-cell--has' : '',
                  isToday ? 'cac-cell--today' : '',
                  hasLive ? 'cac-cell--live' : '',
                  openDay === cell.key ? 'cac-cell--open' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setOpenDay(openDay === cell.key ? null : cell.key)}
              >
                <span className="cac-day-num">{dayNum}</span>
                <span className="cac-sprites">
                  {uniqueAuctions.slice(0, MAX_SPRITES).map((a) => {
                    const sprite = itemSprite(a, catalog);
                    return sprite ? (
                      <img key={a.auctionId} src={`/sprites/${sprite}`} alt={itemName(a)} title={itemName(a)} loading="lazy" />
                    ) : (
                      <span key={a.auctionId} className="cac-sprite-fallback" title={itemName(a)}>{TYPE_ICON[a.type]}</span>
                    );
                  })}
                  {uniqueAuctions.length > MAX_SPRITES && (
                    <span className="cac-more">+{uniqueAuctions.length - MAX_SPRITES}</span>
                  )}
                </span>
              </button>
              {openDay === cell.key && dayAuctions.length > 0 && (
                <div className="cac-day-pop">
                  {dayAuctions.map((a) => {
                    const status = now < a.startAt ? 'upcoming' : now < a.endAt ? 'live' : 'ended';
                    return (
                      <button key={a.auctionId} type="button" className={`cac-pop-row cac-pop--${status}`} onClick={() => onSelect(a)}>
                        <span className="cac-pop-time">
                          {new Date(a.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })}
                        </span>
                        <span className="cac-pop-name">{itemName(a)}</span>
                        {status === 'live' && <span className="cac-pop-live">🔥</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
