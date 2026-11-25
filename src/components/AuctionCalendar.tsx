import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// Календарь аукционов главы: помесячная 7-колоночная сетка с переключением
// месяцев (глава обычно захватывает 2-3 месяца). В ячейке дня — по одному
// спрайту на предмет (повторы дропов одного предмета не дублируются).
// Клик по дню открывает модалку со списком аукционов дня; клик по аукциону
// пробрасывается наверх (ChapterAuctions откроет модалку с результатами).

export interface CalendarAuction {
  auctionId: string;
  startAt: number;
  endAt: number;
  type: 'collectible' | 'wearable' | 'nft';
  collectible?: string;
  wearable?: string;
  nft?: string;
  /** Ставка во Flower (sfl>0) или ингредиенты (Gem, тикет главы и т.п.). */
  sfl?: number;
  ingredients?: Record<string, number>;
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
  /** Таймзона группировки дней — совпадает с зоной списка (сначала МСК для
   * SSR-совпадения, после монтирования — локальная зона браузера). Иначе
   * аукцион, идущий через полночь в зоне пользователя, «теряется» в календаре. */
  tz: string;
  onSelect: (a: CalendarAuction) => void;
}

const TYPE_ICON: Record<CalendarAuction['type'], string> = {
  collectible: '📦',
  wearable: '👕',
  nft: '🐾',
};

const NFT_SPRITES: Record<string, string> = { Pet: 'icons/pet_nft_egg.png' };

// Значки валют ставки в ячейке дня — те же спрайты игры, что в COST_ICONS
// у ChapterAuctions. Тикеты без записи тут ищем спрайтом в каталоге
// (Duende Cap и т.п. — обычные предметы БД), фолбэк — эмодзи 🎫.
const CURRENCY_SPRITES: Record<string, string> = {
  Flower: 'icons/flower_token.webp',
  Gem: 'icons/gem.webp',
  'Salt Rock': 'icons/salt_rock_ticket.webp',
  'Shiny Feather': 'icons/shiny_feather.webp',
  'Duende Cap': 'icons/beetle_wing.webp',
  'Beetle Wing': 'icons/beetle_wing.webp',
};

/** Валюты ставки аукциона: Flower, если платят цветком, иначе ингредиенты. */
function currenciesOf(a: CalendarAuction): string[] {
  const out: string[] = [];
  if ((a.sfl ?? 0) > 0) out.push('Flower');
  out.push(...Object.keys(a.ingredients ?? {}));
  return out;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MAX_SPRITES = 4;

function itemName(a: CalendarAuction): string {
  return a.collectible ?? a.wearable ?? a.nft ?? '—';
}

function itemSprite(a: CalendarAuction, catalog: Props['catalog']): string | null {
  return catalog[itemName(a)]?.sprite ?? (a.nft ? NFT_SPRITES[a.nft] : undefined) ?? null;
}

/** Значок валюты: спрайт игры / каталога, либо эмодзи-фолбэк. */
function CurrencyBadge({ name, catalog, size = 14 }: { name: string; catalog: Props['catalog']; size?: number }) {
  const sprite = CURRENCY_SPRITES[name] ?? catalog[name]?.sprite;
  if (!sprite) return <span className="cac-cur-fallback" title={name}>🎫</span>;
  return <img src={`/sprites/${sprite}`} alt={name} title={name} width={size} height={size} loading="lazy" />;
}

// Дни и месяцы считаем в таймзоне пользователя — как группировка списка
// (ChapterAuctions передаёт свой tz). Форматтеры кэшируем по зоне.
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(tz: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tz}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat('ru-RU', { timeZone: tz, ...opts });
    fmtCache.set(key, f);
  }
  return f;
}

function dayKey(ms: number, tz: string): string {
  return fmt(tz, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
}

function dayStartMs(dayKeyStr: string): number {
  const [d, m, y] = dayKeyStr.split('.').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Ключ месяца "YYYY-MM" по зоне tz. */
function monthKey(ms: number, tz: string): string {
  const [, m, y] = dayKey(ms, tz).split('.').map(Number);
  return `${y}-${String(m).padStart(2, '0')}`;
}

function monthStartMs(mk: string): number {
  const [y, m] = mk.split('-').map(Number);
  return Date.UTC(y, m - 1, 1);
}

export default function AuctionCalendar({ auctions, catalog, chapterStart, chapterEnd, now, tz, onSelect }: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAuction[]>();
    auctions.forEach((a) => {
      // Аукцион может идти через полночь — показываем его во всех днях,
      // которые он затрагивает (обычно 1–2 дня; ограничение — страховка).
      let d = dayStartMs(dayKey(a.startAt, tz));
      const last = dayStartMs(dayKey(a.endAt, tz));
      for (let i = 0; d <= last && i < 4; i++, d += 86_400_000) {
        const key = dayKey(d, tz);
        const list = map.get(key) ?? [];
        list.push(a);
        map.set(key, list);
      }
    });
    map.forEach((list) => list.sort((a, b) => a.startAt - b.startAt));
    return map;
  }, [auctions, tz]);

  // Месяцы, которые накрывает глава (в зоне tz).
  const months = useMemo(() => {
    if (!chapterStart || !chapterEnd) return [];
    const out: string[] = [];
    const first = monthKey(chapterStart, tz);
    const last = monthKey(chapterEnd - 1, tz);
    let mk = first;
    while (mk <= last && out.length < 12) {
      out.push(mk);
      const [y, m] = mk.split('-').map(Number);
      mk = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return out;
  }, [chapterStart, chapterEnd, tz]);

  // Текущий месяц по умолчанию, если он внутри главы; иначе первый месяц главы.
  const nowMonth = monthKey(now, tz);
  const [monthCursor, setMonthCursor] = useState(() => (months.includes(nowMonth) ? nowMonth : months[0]));

  // Зона определяется после монтирования — курсор мог встать на МСК-месяц.
  useEffect(() => {
    setMonthCursor((cur) => (months.includes(nowMonth) && cur === months[0] && months[0] !== nowMonth ? nowMonth : cur));
    // Реагируем только на смену зоны; ручное листание месяцев не трогаем.
  }, [tz]); // eslint-disable-line react-hooks/exhaustive-deps

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
      out.push({ ms, inChapter: ms >= dayStartMs(dayKey(chapterStart, tz)) && ms <= dayStartMs(dayKey(chapterEnd - 1, tz)), key: dayKey(ms, tz) });
    }
    return out;
  }, [monthCursor, chapterStart, chapterEnd, tz]);

  if (months.length === 0) {
    return <div className="cac-empty">Границы главы неизвестны — календарь не построить.</div>;
  }

  const todayKey = dayKey(now, tz);
  const monthIdx = months.indexOf(monthCursor);
  const monthLabel = fmt(tz, { month: 'long', year: 'numeric' }).format(monthStartMs(monthCursor));

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
          // Валюты дня без повторов — значки внизу ячейки (Flower / Gem / тикет).
          const dayCurrencies = [...new Set(dayAuctions.flatMap(currenciesOf))];
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
                onClick={() => { if (dayAuctions.length > 0) setOpenDay(openDay === cell.key ? null : cell.key); }}
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
                {dayCurrencies.length > 0 && (
                  <span className="cac-currencies">
                    {dayCurrencies.map((c) => <CurrencyBadge key={c} name={c} catalog={catalog} />)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Модалка со списком аукционов выбранного дня */}
      {openDay && (byDay.get(openDay)?.length ?? 0) > 0 && createPortal(
        <div className="cac-modal-overlay" onClick={() => setOpenDay(null)}>
          <div className="cac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cac-modal-head">
              <span className="cac-modal-title">{fmt(tz, { day: 'numeric', month: 'long', weekday: 'long' }).format(dayStartMs(openDay))}</span>
              <button type="button" className="cac-modal-close" onClick={() => setOpenDay(null)} aria-label="Закрыть">✕</button>
            </div>
            <div className="cac-modal-body">
              {(byDay.get(openDay) ?? []).map((a) => {
                const status = now < a.startAt ? 'upcoming' : now < a.endAt ? 'live' : 'ended';
                const sprite = itemSprite(a, catalog);
                return (
                  <button
                    key={a.auctionId}
                    type="button"
                    className={`cac-pop-row cac-pop--${status}`}
                    onClick={() => { setOpenDay(null); onSelect(a); }}
                  >
                    {sprite ? (
                      <img className="cac-pop-sprite" src={`/sprites/${sprite}`} alt="" loading="lazy" />
                    ) : (
                      <span className="cac-sprite-fallback">{TYPE_ICON[a.type]}</span>
                    )}
                    <span className="cac-pop-time">
                      {fmt(tz, { hour: '2-digit', minute: '2-digit' }).format(a.startAt)}–{fmt(tz, { hour: '2-digit', minute: '2-digit' }).format(a.endAt)}
                    </span>
                    <span className="cac-pop-cur">
                      {currenciesOf(a).map((c) => <CurrencyBadge key={c} name={c} catalog={catalog} size={16} />)}
                    </span>
                    <span className="cac-pop-name">{itemName(a)}</span>
                    {status === 'live' && <span className="cac-pop-live">🔥</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
