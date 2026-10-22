import { useState } from 'react';
import { CoinsIcon } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { SKILL_ICONS } from '../../lib/skills';
import type { SkillRank } from '../../lib/toolCosts';
import {
  NO_COIN_SELL_BOOSTS,
  OFFICIAL_COIN_PACKAGES,
  SELLABLE_GROUP_LABELS,
  SELLABLE_PRICE_NAMES,
  coinRateRows,
  coinRateSummary,
  coinSwindlerRanks,
  type CoinSellBoosts,
} from '../../lib/coinRate';

function formatCoins(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: n < 10 ? 2 : 0 });
}

/** Цена урожая на рынке — доли Flower, держим 2 значащие цифры. */
function formatFloor(n: number): string {
  return n.toLocaleString('ru-RU', { maximumSignificantDigits: 2 });
}

export default function CoinRateTable() {
  const prices = useItemPrices(SELLABLE_PRICE_NAMES);
  const [boosts, setBoosts] = useState<CoinSellBoosts>(NO_COIN_SELL_BOOSTS);

  const rows = prices ? coinRateRows(prices, boosts) : null;
  const summary = rows ? coinRateSummary(rows) : null;
  // Сначала самые выгодные для обмена (больше монет за 1 Flower), без цены — в конце.
  const sorted = rows
    ? [...rows].sort((a, b) => (b.coinsPerFlower ?? -1) - (a.coinsPerFlower ?? -1))
    : null;

  const swindlerRanks = coinSwindlerRanks();
  const bestOfficialRate = Math.max(...OFFICIAL_COIN_PACKAGES.map((p) => p.coins / p.flower));

  return (
    <div className="ref-coin-calc">
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <label className="ref-marvel-boost-check">
            {SKILL_ICONS['Coin Swindler'] && (
              <img src={SKILL_ICONS['Coin Swindler']} alt="" className="ref-marvel-icon ref-food-icon--sm" />
            )}
            <span>
              Coin Swindler <span className="ref-price-hint">(урожай)</span>
            </span>
            <select
              value={boosts.coinSwindler}
              onChange={(e) => setBoosts((b) => ({ ...b, coinSwindler: Number(e.target.value) as SkillRank }))}
              className="ref-food-rank-select"
            >
              <option value={0}>выкл</option>
              {swindlerRanks.map((r, i) => (
                <option key={i} value={i + 1}>
                  ранг {i + 1} · +{Math.round(r * 100)}%
                </option>
              ))}
            </select>
          </label>
          <label className="ref-marvel-boost-check">
            <input
              type="checkbox"
              checked={boosts.greenThumbLegacy}
              onChange={(e) => setBoosts((b) => ({ ...b, greenThumbLegacy: e.target.checked }))}
            />
            <img src="/sprites/skills/land/crops/green_thumb_LE.png" alt="" className="ref-marvel-icon ref-food-icon--sm" />
            <span>
              Green Thumb <span className="ref-price-hint">(старый навык в инвентаре, +5% за урожай)</span>
            </span>
          </label>
        </div>
      </div>

      <div className="ref-marvel-boost-widget ref-coin-summary">
        {summary == null ? (
          <p className="ref-section-desc">Загружаем цены маркетплейса…</p>
        ) : summary.rate == null ? (
          <p className="ref-section-desc">Цены маркетплейса сейчас недоступны — курс посчитать не из чего.</p>
        ) : (
          <>
            <p className="ref-coin-rate-main">
              <span className="ref-coin-rate-label">Курс (среднее по {summary.top.length} самым выгодным из {summary.priced}):</span>
              <span className="ref-coin-rate-value">
                <strong>1</strong>
                <img className="ref-recipe-icon" src="/sprites/icons/flower_token.webp" alt="Flower" />
                <span>≈</span>
                <span className="ref-resource-chip">
                  <CoinsIcon />
                  <strong>{formatCoins(summary.rate)}</strong>
                </span>
              </span>
            </p>
            <p className="ref-tool-summary-line">
              <span>Курс по:</span>
              {summary.top.map((r) => (
                <span key={r.item.name} className="ref-resource-chip">
                  <img src={r.item.icon} alt="" className="gc-res-icon" />
                  <strong>{r.item.name}</strong> {formatCoins(r.coinsPerFlower!)}
                </span>
              ))}
              <span className="ref-price-hint">— монет за 1 Flower: купить на рынке, продать Бетти</span>
            </p>
            <p className="ref-tool-summary-line ref-price-hint">
              Обмен в игре (Flower → монеты):{' '}
              {OFFICIAL_COIN_PACKAGES.map((p) => `${p.flower} → ${p.coins.toLocaleString('ru-RU')}`).join(', ')} —
              не больше {bestOfficialRate.toLocaleString('ru-RU')} монет за 1 Flower.
              {summary.rate > bestOfficialRate &&
                ` Через урожай выходит в ${(summary.rate / bestOfficialRate).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} раза выгоднее.`}
            </p>
          </>
        )}
      </div>

      <div className="ref-table-wrap">
        <table className="ref-table ref-coin-table">
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Бетти, монет</th>
              <th>Рынок, Flower</th>
              <th>Монет за 1 Flower</th>
            </tr>
          </thead>
          <tbody>
            {sorted == null ? (
              <tr>
                <td colSpan={4}>…</td>
              </tr>
            ) : (
              sorted.map((r) => {
                // Подсвечиваем предметы, из которых посчитан курс.
                const inRate = summary?.top.includes(r) ?? false;
                return (
                  <tr key={r.item.name} className={inRate ? 'ref-coin-row--best' : undefined}>
                    <td className="ref-table-name">
                      <span className="ref-tool-name">
                        <img src={r.item.icon} alt="" className="ref-tool-icon" />
                        <span>
                          {r.item.name}
                          <span className="ref-tool-sub">
                            {r.item.labelRu} · {SELLABLE_GROUP_LABELS[r.item.group].toLowerCase()}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="ref-coin-cell--betty">
                      <span className="ref-resource-chip">
                        <CoinsIcon />
                        {formatCoins(r.betty)}
                      </span>
                    </td>
                    <td className="ref-coin-cell--floor">
                      {r.floor == null ? 'нет данных' : (
                        <span className="ref-flower-compact">
                          {formatFloor(r.floor)}{' '}
                          <img className="ref-recipe-icon" src="/sprites/icons/flower_token.webp" alt="Flower" />
                        </span>
                      )}
                    </td>
                    <td className={`ref-coin-cell--rate${inRate ? ' ref-coin-rate--good' : ''}`}>
                      {r.coinsPerFlower == null ? '—' : formatCoins(r.coinsPerFlower)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
