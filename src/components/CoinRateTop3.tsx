import './CoinRateTop3.css';
import { useItemPrices } from '../lib/useItemPrices';
import {
  NO_COIN_SELL_BOOSTS,
  OFFICIAL_COIN_PACKAGES,
  SELLABLE_PRICE_NAMES,
  coinRateRows,
  coinRateSummary,
} from '../lib/coinRate';

const COINS_ICON = '/sprites/ui/coins.png';
const FLOWER_ICON = '/sprites/icons/flower_token.webp';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

/**
 * Живой блок для гайда «Как заработать монеты»: текущий курс монет и топ-3
 * предмета, которые выгоднее всего продавать Бетти (больше всего монет на
 * каждый Flower их рыночной цены). Данные — те же, что в разделе «Курс монет».
 */
export default function CoinRateTop3() {
  const prices = useItemPrices(SELLABLE_PRICE_NAMES);
  const rows = prices ? coinRateRows(prices, NO_COIN_SELL_BOOSTS) : null;
  const summary = rows ? coinRateSummary(rows) : null;
  // Те же 3 предмета, из которых считается курс.
  const top = summary?.top ?? [];
  const officialRate = Math.max(...OFFICIAL_COIN_PACKAGES.map((p) => p.coins / p.flower));

  return (
    <aside className="gc-coin-top3" data-no-lightbox>
      <div className="gc-coin-top3-head">
        <img src={COINS_ICON} alt="" className="gc-coin-top3-icon" />
        <strong>Курс монет сейчас</strong>
        <span className="gc-coin-top3-live">обновляется по ценам маркетплейса</span>
      </div>

      {summary == null ? (
        <p className="gc-coin-top3-muted">Загружаем цены…</p>
      ) : summary.rate == null ? (
        <p className="gc-coin-top3-muted">Цены маркетплейса сейчас недоступны.</p>
      ) : (
        <>
          <p className="gc-coin-top3-rate">
            1 <img src={FLOWER_ICON} alt="Flower" className="gc-coin-top3-icon" /> ≈{' '}
            <strong>{fmt(summary.rate)}</strong> <img src={COINS_ICON} alt="монет" className="gc-coin-top3-icon" />
            <span className="gc-coin-top3-muted"> по 3 самым выгодным предметам · обмен в игре — до {fmt(officialRate)}</span>
          </p>
          <p className="gc-coin-top3-subtitle">Выгоднее всего продавать Бетти:</p>
          <ol className="gc-coin-top3-list">
            {top.map((r) => (
              <li key={r.item.name}>
                <img src={r.item.icon} alt="" className="gc-coin-top3-item-icon" />
                <span className="gc-coin-top3-name">
                  {r.item.name} <span className="gc-coin-top3-muted">({r.item.labelRu.toLowerCase()})</span>
                </span>
                <span className="gc-coin-top3-value">{fmt(r.coinsPerFlower!)} монет за 1 Flower</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <a className="gc-coin-top3-link" href="/codex?tab=mechanics&amp;ref=coins">
        Вся таблица и бусты →
      </a>
    </aside>
  );
}
