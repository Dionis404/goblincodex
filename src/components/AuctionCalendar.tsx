import { useMemo, useState } from 'react';

// Календарь аукционов главы: 7-колоночная сетка дней от старта до конца
// главы, в ячейке дня — спрайты предметов аукционов этого дня. Клик по дню
// открывает список аукционов дня; клик по аукциону пробрасывается наверх
// (ChapterAuctions откроет модалку с результатами — та же, что у списка).

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
  /** Границы главы (мс) — сетка строится строго по ним. */
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

// Ключ дня в конкретной таймзоне: аукционы группируем по дню начала в МСК —
// как в списке (formatDay там тоже берёт МСК до определения локальной зоны).
const DAY_FMT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' });
const MONTH_FMT = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', month: 'long' });

function dayKey(ms: number): string {
  return DAY_FMT.format(ms);
}

function dayStartMs(dayKeyStr: string): number {
  const [d, m, y] = dayKeyStr.split('.').map(Number);
  return Date.UTC(y, m - 1, d);
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

  const cells = useMemo(() => {
    if (!chapterStart || !chapterEnd) return [];
    const first = dayStartMs(dayKey(chapterStart));
    const last = dayStartMs(dayKey(chapterEnd - 1));
    // Сетка начинается с понедельника недели старта главы.
    const firstWeekday = (new Date(first).getUTCDay() + 6) % 7; // 0 = Пн
    const gridStart = first - firstWeekday * 86_400_000;
    const out: { ms: number; inChapter: boolean; key: string }[] = [];
    for (let ms = gridStart; ms <= last; ms += 86_400_000) {
      out.push({ ms, inChapter: ms >= first && ms <= last, key: dayKey(ms) });
    }
    return out;
  }, [chapterStart, chapterEnd]);

  // Подписи месяцев над сеткой: месяц встречается в колонке своего первого дня.
  const monthLabels = useMemo(() => {
    const labels = new Map<number, string>();
    cells.forEach((c) => {
      const monthStart = dayStartMs(`01.${c.key.split('.').slice(1).join('.')}`);
      if (![...labels.values()].includes(MONTH_FMT.format(monthStart))) {
        labels.set(c.ms, MONTH_FMT.format(monthStart));
      }
    });
    return labels;
  }, [cells]);

  if (cells.length === 0) {
    return <div className="cac-empty">Границы главы неизвестны — календарь не построить.</div>;
  }

  const todayKey = dayKey(now);

  return (
    <div className="cac-root">
      <div className="cac-weekdays">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="cac-grid">
        {cells.map((cell) => {
          const dayAuctions = cell.inChapter ? byDay.get(cell.key) ?? [] : [];
          const isToday = cell.key === todayKey;
          const dayNum = Number(cell.key.split('.')[0]);
          const monthLabel = monthLabels.get(cell.ms);
          const hasLive = dayAuctions.some((a) => now >= a.startAt && now < a.endAt);
          return (
            <div key={cell.ms} className="cac-cell-wrap">
              {monthLabel && <div className="cac-month">{monthLabel}</div>}
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
                  {dayAuctions.slice(0, MAX_SPRITES).map((a) => {
                    const sprite = itemSprite(a, catalog);
                    return sprite ? (
                      <img key={a.auctionId} src={`/sprites/${sprite}`} alt={itemName(a)} title={itemName(a)} loading="lazy" />
                    ) : (
                      <span key={a.auctionId} className="cac-sprite-fallback" title={itemName(a)}>{TYPE_ICON[a.type]}</span>
                    );
                  })}
                  {dayAuctions.length > MAX_SPRITES && (
                    <span className="cac-more">+{dayAuctions.length - MAX_SPRITES}</span>
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
                  {dayAuctions.length === 0 && <div className="cac-pop-empty">Нет аукционов</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
