import { useEffect, useState } from 'react';
import { GEM_USD, SUPPLY_EXPONENT, SUPPLY_REFERENCE } from '../lib/auctionTiers';
import { pluralRu } from '../lib/formatRelativeTime';
import './AuctionTiers.css';

interface Boost {
  labelType: string;
  text: string;
}

interface TopRange {
  from: number;
  to: number;
}

interface TierRow {
  name: string;
  type: 'collectible' | 'wearable' | 'nft';
  tier: number;
  supply: number;
  drops: number;
  priceUsd: number;
  source: 'market' | 'auction';
  marketUsd: number | null;
  marketFlower: number | null;
  auctionUsd: number | null;
  auctionFlower: number | null;
  auctionGems: number | null;
  winners: number;
  multiplier: number;
  score: number;
  ticketSupply: number;
  ticket: string | null;
  topRange: TopRange | null;
  sprite: string | null;
  boosts: Boost[];
}

interface PendingItem {
  name: string;
  type: 'collectible' | 'wearable' | 'nft';
  supply: number;
  firstStart: number;
  ticketSupply: number;
  ticketDrops: number;
  ticket: string | null;
  prelimTier: number | null;
  boost: boolean;
  topRange: TopRange | null;
  sprite: string | null;
  boosts: Boost[];
}

interface Payload {
  chapterName: string | null;
  chapterOrder?: number;
  rows: TierRow[];
  pending: PendingItem[];
  auctionsTotal: number;
  auctionsEnded: number;
  flowerRateNow: number | null;
  statsReadyAt: number | null;
}

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: Payload };

const TYPE_ICON = { collectible: '📦', wearable: '👕', nft: '🐾' } as const;

const usd = (v: number | null) =>
  v == null ? '—' : `$${v.toLocaleString('ru-RU', { minimumFractionDigits: v < 10 ? 2 : 0, maximumFractionDigits: v < 10 ? 2 : 0 })}`;
const num = (v: number | null, digits = 0) =>
  v == null ? '—' : v.toLocaleString('ru-RU', { maximumFractionDigits: digits });
const date = (ms: number) => new Date(ms).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const drops = (n: number) => `${n} ${pluralRu(n, 'дроп', 'дропа', 'дропов')}`;
const pieces = (n: number) => `${num(n)} ${pluralRu(n, 'штука', 'штуки', 'штук')}`;
const place = (r: TopRange) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`);

function Boosts({ boosts }: { boosts: Boost[] }) {
  if (boosts.length === 0) return null;
  return (
    <span className="ct-boosts">
      {boosts.map((b, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          <span className={`ct-boost-txt ct-boost-txt--${b.labelType}`}>{b.text}</span>
        </span>
      ))}
    </span>
  );
}

function ItemSprite({ sprite, type, name }: { sprite: string | null; type: TierRow['type']; name: string }) {
  if (!sprite) return <span className="ct-type-icon">{TYPE_ICON[type]}</span>;
  return <img src={`/sprites/${sprite}`} alt={name} loading="lazy" />;
}

export default function AuctionTiers() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auctions/tiers.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Payload>;
      })
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'loading') {
    return <div className="ct-loading">Считаем тиры по ставкам и рынку…</div>;
  }
  if (state.status === 'error' || !state.data.chapterName) {
    return <div className="ct-loading">Не удалось загрузить тиры аукционов.</div>;
  }

  const { rows, pending, auctionsTotal, auctionsEnded, flowerRateNow, statsReadyAt, chapterName, chapterOrder } = state.data;

  return (
    <div className="ct-root">
      <p className="ct-sub">
        Глава {chapterOrder}: {chapterName} · аукционов: {auctionsTotal}, завершено: {auctionsEnded}.
        {flowerRateNow != null && ` Курс Flower сейчас: ${usd(flowerRateNow)}.`}
        {statsReadyAt != null && (statsReadyAt > Date.now()
          ? ` Полная статистика ставок за Flower и Gem соберётся к ${date(statsReadyAt)}.`
          : ' Статистика ставок за Flower и Gem собрана полностью.')}
      </p>

      <details className="ct-how">
        <summary>Как считается тир</summary>
        <ol>
          <li>
            <b>Цена предмета в $.</b> Если предмет уже торгуется на маркетплейсе — его floor в $.
            Если нет — медиана ставок победителей на уже прошедших дропах за Flower и Gem: Flower по
            курсу на момент аукциона, Gem по цене пака (15 500 gems за $129,99, то есть {usd(GEM_USD * 1000)}
            {' '}за 1000 gems). Дропы за тикеты главы в цену не входят. Питомцы (NFT) оцениваются по
            самому дешёвому питомцу на маркетплейсе — яйцо с аукциона может достаться любой.
          </li>
          <li>
            <b>Поправка на саплай.</b> Чем меньше штук разыграно, тем предмет ценнее:
            цена × ({SUPPLY_REFERENCE} ÷ саплай)<sup>{SUPPLY_EXPONENT}</sup>.
          </li>
          <li>
            <b>Место в топе</b> — на каких местах рейтинга по тикетам главы игрок забирает предмет,
            если все игроки выше разбирают более высокие тиры.
          </li>
        </ol>
        <p className="ct-note">
          Рейтинг пересчитывается по мере прохождения дропов: чем больше ставок, тем точнее цена.
          Полная версия с пояснениями — на странице <a href="/codex/chapter/auction-tiers">тиров аукционов</a>.
        </p>
      </details>

      {rows.length > 0 ? (
        <div className="ct-table-wrap">
          <table className="ct-table">
            <thead>
              <tr>
                <th>Тир</th>
                <th>Предмет</th>
                <th>Саплай</th>
                <th>Рынок</th>
                <th>Аукцион (медиана)</th>
                <th>Поправка</th>
                <th>Итог</th>
                <th>Место в топе</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td data-label="Тир">
                    <span className={`ct-tier-badge${r.tier <= 3 ? ' ct-tier-badge--top' : ''}`}>{r.tier}</span>
                  </td>
                  <td data-label="Предмет">
                    <span className="ct-item">
                      <ItemSprite sprite={r.sprite} type={r.type} name={r.name} />
                      {r.name}
                    </span>
                    <Boosts boosts={r.boosts} />
                  </td>
                  <td data-label="Саплай" className="ct-num">
                    {num(r.supply)}
                    {r.drops > 1 && <span className="ct-hint"> ({drops(r.drops)})</span>}
                  </td>
                  <td data-label="Рынок" className="ct-num">
                    {r.marketUsd != null ? (
                      <>
                        <span className={r.source === 'market' ? 'ct-used' : ''}>{usd(r.marketUsd)}</span>
                        {r.marketFlower != null && <span className="ct-hint">{num(r.marketFlower, 2)} Flower</span>}
                      </>
                    ) : (
                      <span className="ct-hint">не продаётся</span>
                    )}
                  </td>
                  <td data-label="Аукцион" className="ct-num">
                    {r.auctionUsd != null ? (
                      <>
                        <span className={r.source === 'auction' ? 'ct-used' : ''}>{usd(r.auctionUsd)}</span>
                        <span className="ct-hint">
                          {[
                            r.auctionFlower ? `${num(r.auctionFlower, 2)} Flower` : '',
                            r.auctionGems ? `${num(r.auctionGems)} Gem` : '',
                          ].filter(Boolean).join(' + ')}
                          {` · ${r.winners} ставок`}
                        </span>
                      </>
                    ) : (
                      <span className="ct-hint">нет ставок</span>
                    )}
                  </td>
                  <td data-label="Поправка" className="ct-num">×{num(r.multiplier, 2)}</td>
                  <td data-label="Итог" className="ct-num"><b>{usd(r.score)}</b></td>
                  <td data-label="Место в топе" className="ct-num">
                    {r.topRange ? (
                      <>
                        <b>{place(r.topRange)}</b>
                        <span className="ct-hint">{pieces(r.ticketSupply)} за {r.ticket}</span>
                      </>
                    ) : (
                      <span className="ct-hint">не за тикеты</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ct-empty">
          Пока не по чему считать: предметы главы ещё не продаются на рынке, а их дропы за Flower и Gem ещё не прошли.
        </div>
      )}

      {pending.length > 0 && (
        <>
          <h3 className="ct-h3">⏳ Предварительный тир</h3>
          <p className="ct-note">
            Цены у этих предметов ещё нет. Место оценено по саплаю дропов за тикеты главы —
            меньше штук за тикеты → выше тир; бонусные выше декора. Настоящий тир появится
            после первого дропа за Flower или Gem.
          </p>
          <ul className="ct-pending">
            {pending.map((p) => (
              <li key={p.name} className="ct-pending-item">
                <span className="ct-tier-badge ct-tier-badge--prelim" title="Предварительный тир">{p.prelimTier ?? '—'}</span>
                <ItemSprite sprite={p.sprite} type={p.type} name={p.name} />
                <span>
                  {p.name}
                  <Boosts boosts={p.boosts} />
                  <span className="ct-hint">
                    {p.boost ? 'бонус' : 'декор'} ·{' '}
                    {p.ticket
                      ? `за ${p.ticket}: ${pieces(p.ticketSupply)} (${drops(p.ticketDrops)})`
                      : 'дропов за тикеты нет'}
                  </span>
                  {p.topRange && <span className="ct-place">место в топе: {place(p.topRange)}</span>}
                  <span className="ct-hint">всего саплай {num(p.supply)} · первый аукцион {date(p.firstStart)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
