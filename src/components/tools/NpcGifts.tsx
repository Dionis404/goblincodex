import { useMemo, useState } from 'react';
import './FishCatalog.css';
import './FlowerRecipes.css';
import './NpcGifts.css';
import BoostPanel from '../BoostPanel';
import { FlowerAmount } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { SKILL_ICONS } from '../../lib/skills';
import type { SkillRank } from '../../lib/toolCosts';
import { FLOWER_PRICE_NAMES, flowerCosts, flowerIcon, flowerTimes, formatDays } from '../../lib/flowers';
import {
  NPC_NAMES,
  bestFor,
  blossomBonus,
  describeGift,
  favoriteFlowers,
  flowersToReach,
  giftRows,
  milestones,
  npcLabel,
  repeatGift,
  repeatStep,
  repeatThreshold,
  sortGiftRows,
  type GiftRow,
  type GiftSort,
} from '../../lib/npcGifts';

const SORTS: { key: GiftSort; label: string; hint: string }[] = [
  { key: 'value', label: '💰 Выгоднее всего', hint: 'Больше очков дружбы на 1 Flower себестоимости цветка' },
  { key: 'points', label: '❤️ Больше очков', hint: 'Максимум очков за один цветок' },
  { key: 'fast', label: '⚡ Быстрее всего', hint: 'Цветок, который быстрее вырастить (вся цепочка посадок)' },
];

const TOP_ROWS = 10;
const FAVORITE_ICONS = 5;

function fmtValue(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('ru-RU', { maximumFractionDigits: v >= 100 ? 0 : 1 });
}

function FlowerChip({ row, label }: { row: GiftRow; label: string }) {
  return (
    <span className="ref-npc-chip" title={`${row.flower}: ${row.points} очков`}>
      <img src={flowerIcon(row.flower)} alt="" className="ref-fish-icon" style={{ width: 22, height: 22 }} />
      <span>
        <strong>{row.flower}</strong>
        <span className="ref-price-hint"> {label}</span>
      </span>
    </span>
  );
}

export default function NpcGifts() {
  const prices = useItemPrices(FLOWER_PRICE_NAMES);
  const { rate } = useCoinRate();
  const [blossom, setBlossom] = useState<SkillRank>(0);
  const [npc, setNpc] = useState<string>(NPC_NAMES[0]);
  const [sort, setSort] = useState<GiftSort>('value');
  const [showAll, setShowAll] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  // Повторные награды бесконечны: показываем несколько и даём подгрузить ещё.
  const [repeatsShown, setRepeatsShown] = useState(2);
  const [repeatTarget, setRepeatTarget] = useState(10);

  const costs = useMemo(() => (prices ? flowerCosts(prices, rate) : null), [prices, rate]);
  const times = useMemo(() => flowerTimes(), []);
  const loaded = costs != null;

  // Строки по каждому NPC нужны для обзорной таблицы, поэтому считаем сразу все.
  const byNpc = useMemo(
    () => Object.fromEntries(NPC_NAMES.map((n) => [n, giftRows(n, costs ?? {}, times, blossom)])),
    [costs, times, blossom],
  );

  const rows = byNpc[npc];
  const sorted = sortGiftRows(rows, sort);
  const shown = showAll ? sorted : sorted.slice(0, TOP_ROWS);
  const best = bestFor(rows);
  const giftRow = rows.find((r) => r.flower === chosen) ?? best.value ?? best.points;
  // Пройденные повторы сворачиваем в одну строку, вперёд показываем repeatsShown предстоящих.
  const stepNow = repeatStep(npc) ?? 1;
  const lastPlanned = milestones(npc, 0).at(-1)?.points ?? 0;
  const passedRepeats = current > lastPlanned ? Math.floor((current - lastPlanned) / stepNow) : 0;
  const marks = milestones(npc, passedRepeats + repeatsShown).filter((m) => !m.repeating || m.points > current);
  const repeatReward = repeatGift(npc);
  const targetPoints = repeatThreshold(npc, repeatTarget);
  const targetFlowers = giftRow && targetPoints != null ? flowersToReach(targetPoints, current, giftRow.points) : 0;
  const step = repeatStep(npc);

  function pickNpc(n: string) {
    setNpc(n);
    setChosen(null);
    setShowAll(false);
    setRepeatsShown(2);
    window.setTimeout(() => document.getElementById('npc-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  return (
    <div className="ref-npc-calc">
      <BoostPanel title="Бонус навыка">
        <div className="ref-marvel-boost-widget">
          <label className="ref-marvel-boost-check">
            {SKILL_ICONS['Blossom Bonding'] && (
              <img src={SKILL_ICONS['Blossom Bonding']} alt="" className="ref-marvel-icon ref-food-icon--sm" />
            )}
            <span>
              Blossom Bonding <span className="ref-price-hint">(+очков за каждый цветок)</span>
            </span>
            <select
              value={blossom}
              onChange={(e) => setBlossom(Number(e.target.value) as SkillRank)}
              className="ref-food-rank-select"
            >
              <option value={0}>выкл</option>
              {[1, 2, 3].map((r) => (
                <option key={r} value={r}>ранг {r} · +{blossomBonus(r as SkillRank)}</option>
              ))}
            </select>
          </label>
        </div>
      </BoostPanel>

      <div className="ref-table-wrap">
        <table className="ref-table ref-npc-table">
          <thead>
            <tr>
              <th>NPC</th>
              <th>Любит больше всего</th>
              <th>💰 Выгоднее всего</th>
              <th>❤️ Больше очков</th>
              <th>⚡ Быстрее всего</th>
            </tr>
          </thead>
          <tbody>
            {NPC_NAMES.map((n) => {
              const favs = favoriteFlowers(n);
              const b = bestFor(byNpc[n]);
              return (
                <tr key={n} className={n === npc ? 'ref-npc-row--on' : undefined}>
                  <td data-label="NPC">
                    <button type="button" className="ref-npc-name" onClick={() => pickNpc(n)} title="Показать подробности">
                      {npcLabel(n)}
                    </button>
                  </td>
                  <td data-label="Любит больше всего">
                    <span className="ref-npc-favs">
                      {favs.slice(0, FAVORITE_ICONS).map((f) => (
                        <span className="ref-npc-fav" key={f.flower} title={`${f.flower}: +${f.bonus} к очкам`}>
                          <img src={flowerIcon(f.flower)} alt={f.flower} />
                          <b>+{f.bonus}</b>
                        </span>
                      ))}
                      {favs.length > FAVORITE_ICONS && (
                        <button type="button" className="ref-flower-hidden" onClick={() => pickNpc(n)} title="Показать всех любимых">
                          ещё {favs.length - FAVORITE_ICONS}
                        </button>
                      )}
                    </span>
                  </td>
                  <td data-label="Выгоднее всего">
                    {b.value ? <FlowerChip row={b.value} label={`${b.value.points} оч. · ${fmtValue(b.value.value)} оч./Flower`} /> : <span className="ref-price-hint">{loaded ? '—' : '…'}</span>}
                  </td>
                  <td data-label="Больше очков">
                    {b.points && <FlowerChip row={b.points} label={`${b.points.points} оч.`} />}
                  </td>
                  <td data-label="Быстрее всего">
                    {b.fast ? <FlowerChip row={b.fast} label={`${b.fast.points} оч. · ${formatDays(b.fast.days!)}`} /> : <span className="ref-price-hint">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ref-bait-card ref-npc-details" id="npc-details">
        <div className="ref-comp-head">
          <div>
            <strong className="ref-comp-name">{npcLabel(npc)}</strong>
            <span className="ref-tool-sub">
              {favoriteFlowers(npc).length} любимых цветов · {rows.length} цветов можно подарить
              {blossom > 0 && <> · Blossom Bonding +{blossomBonus(blossom)} к каждому</>}
            </span>
          </div>
          <label className="ref-npc-select">
            <span className="ref-price-hint">NPC:</span>
            <select value={npc} onChange={(e) => { setNpc(e.target.value); setChosen(null); setShowAll(false); setRepeatsShown(2); }} className="ref-food-rank-select">
              {NPC_NAMES.map((n) => <option key={n} value={n}>{npcLabel(n)}</option>)}
            </select>
          </label>
        </div>

        <div className="ref-flower-sort" role="group" aria-label="Порядок цветов">
          <span className="ref-price-hint">Сначала:</span>
          {SORTS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`gc-btn-secondary ref-flower-sort-btn${sort === o.key ? ' ref-flower-sort-btn--on' : ''}`}
              aria-pressed={sort === o.key}
              title={o.hint}
              onClick={() => setSort(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <div className="ref-table-wrap">
          <table className="ref-table ref-npc-flowers">
            <thead>
              <tr>
                <th>Цветок</th>
                <th>Очки</th>
                <th>Себестоимость</th>
                <th>Очков на 1 Flower</th>
                <th>Время</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const isBest = best.value?.flower === r.flower;
                return (
                  <tr
                    key={r.flower}
                    className={`ref-npc-flower-row${giftRow?.flower === r.flower ? ' ref-npc-row--on' : ''}`}
                    onClick={() => setChosen(r.flower)}
                    title="Нажмите, чтобы посчитать награды по этому цветку"
                  >
                    <td data-label="Цветок">
                      <span className="ref-flower-name">
                        <img src={flowerIcon(r.flower)} alt="" className="ref-fish-icon" style={{ width: 26, height: 26 }} />
                        <span>{r.flower}</span>
                        {r.bonus > 0 && <span className="ref-npc-love" title="Любимый цветок: бонус к очкам">❤ +{r.bonus}</span>}
                        {isBest && <span title="Самый выгодный для этого NPC">💰</span>}
                      </span>
                    </td>
                    <td data-label="Очки">
                      <strong>{r.points}</strong>
                      <span className="ref-price-hint"> ({r.base}{r.bonus > 0 ? ` +${r.bonus}` : ''}{r.skill > 0 ? ` +${r.skill}` : ''})</span>
                    </td>
                    <td data-label="Себестоимость">{r.cost != null ? <>≈ <FlowerAmount compact value={r.cost} /></> : (loaded ? '—' : '…')}</td>
                    <td data-label="Очков на 1 Flower">{fmtValue(r.value)}</td>
                    <td data-label="Время">{r.days != null ? formatDays(r.days) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted.length > TOP_ROWS && (
          <button type="button" className="gc-btn-secondary ref-flower-sort-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? `Только лучшие ${TOP_ROWS}` : `Показать все ${sorted.length} цветов`}
          </button>
        )}

        <h4 className="ref-npc-h">Награды за дружбу</h4>
        <div className="ref-npc-controls">
          <label className="ref-npc-input">
            <span className="ref-price-hint">Сейчас очков дружбы:</span>
            <input
              type="number"
              min={0}
              step={1}
              value={current}
              onChange={(e) => setCurrent(Math.max(0, Number(e.target.value) || 0))}
              className="ref-npc-number"
            />
          </label>
          {giftRow && (
            <span className="ref-npc-using">
              Считаем по цветку:{' '}
              <FlowerChip row={giftRow} label={`${giftRow.points} оч.`} />
            </span>
          )}
        </div>
        <div className="ref-table-wrap">
          <table className="ref-table ref-npc-rewards">
            <thead>
              <tr>
                <th>Очков</th>
                <th>Награда</th>
                <th>Осталось очков</th>
                <th>Цветков</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {marks.map((m, i) => {
                const left = Math.max(0, m.points - current);
                const n = giftRow ? flowersToReach(m.points, current, giftRow.points) : 0;
                const total = giftRow?.cost != null ? n * giftRow.cost : null;
                return (
                  <tr key={`${m.points}-${i}`} className={m.points <= current ? 'ref-npc-reward--done' : undefined}>
                    <td data-label="Очков"><strong>{m.points}</strong>{m.repeating && <span className="ref-price-hint"> (повтор)</span>}</td>
                    <td data-label="Награда">{describeGift(m.gift).join(', ') || '—'}</td>
                    <td data-label="Осталось очков">{left > 0 ? left : '✓'}</td>
                    <td data-label="Цветков">{left > 0 ? n : '—'}</td>
                    <td data-label="Стоимость">{left > 0 && total != null ? <>≈ <FlowerAmount compact value={total} /></> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {passedRepeats > 0 && (
          <p className="ref-price-hint">Повторных наград уже пройдено: {passedRepeats}. Ниже — те, что впереди.</p>
        )}
        <button type="button" className="gc-btn-secondary ref-flower-sort-btn" onClick={() => setRepeatsShown(repeatsShown + 5)}>
          Показать ещё 5 повторов
        </button>
        {step && repeatReward && (
          <p className="ref-price-hint">
            После последней запланированной награды следующая даётся каждые {step} очков и повторяется бесконечно:{' '}
            {describeGift(repeatReward).join(', ') || '—'}.
          </p>
        )}
        {step && targetPoints != null && (
          <div className="ref-npc-target">
            <label className="ref-npc-input">
              <span>Сколько повторных наград нужно:</span>
              <input
                type="number"
                min={1}
                step={1}
                value={repeatTarget}
                onChange={(e) => setRepeatTarget(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="ref-npc-number"
              />
            </label>
            <span>
              Чтобы получить {repeatTarget}-ю повторную награду, нужно <strong>{targetPoints.toLocaleString('ru-RU')}</strong> очков дружбы
              {giftRow && targetFlowers > 0 && (
                <>
                  : ещё <strong>{targetFlowers.toLocaleString('ru-RU')}</strong> цветков «{giftRow.flower}»
                  {giftRow.cost != null && <> ≈ <FlowerAmount compact value={targetFlowers * giftRow.cost} /></>}
                </>
              )}
              .
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
