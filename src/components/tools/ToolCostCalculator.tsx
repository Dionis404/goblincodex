import { Fragment, useState } from 'react';
import NumberStepper from '../NumberStepper';
import { CoinsIcon, FlowerAmount } from '../ResourceIcon';
import { useItemPrices } from '../../lib/useItemPrices';
import { useCoinRate } from '../../lib/useCoinRate';
import { coinsToFlower } from '../../lib/coinRate';
import CoinRateNote from '../CoinRateNote';
import { SKILL_ICONS } from '../../lib/skills';
import BoostPanel from '../BoostPanel';
import {
  TOOLS,
  TOOL_GROUP_LABELS,
  TOOL_PRICE_NAMES,
  TOOL_RESOURCE_ICONS,
  TOOL_RESOURCE_ORDER,
  TOOL_SKILLS,
  NO_TOOL_BOOSTS,
  NO_OIL_BOOSTS,
  OIL_YIELD_BOOSTS,
  isToolBoosted,
  oilFlowerPrice,
  oilUnitCost,
  resourcesFlowerValue,
  skillRanks,
  toolIngredients,
  toolOrderTotal,
  toolUnitPrice,
  type OilBoosts,
  type SkillRank,
  type ToolBoosts,
  type ToolGroup,
  type ToolName,
  type ToolResource,
} from '../../lib/toolCosts';

const MAX_AMOUNT = 9999;
const GROUPS: ToolGroup[] = ['workbench', 'treasure'];

function formatCoins(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function ResourceList({ resources }: { resources: Partial<Record<ToolResource, number>> }) {
  const entries = TOOL_RESOURCE_ORDER.filter((r) => resources[r]);
  if (entries.length === 0) return <>—</>;
  return (
    <span className="ref-resource-chips">
      {entries.map((r) => (
        <span className="ref-resource-chip" key={r} title={r}>
          <img src={TOOL_RESOURCE_ICONS[r]} alt={r} className="gc-res-icon" />
          {resources[r]!.toLocaleString('ru-RU')}
        </span>
      ))}
    </span>
  );
}

/** Подпись ранга: множитель цены → «−20%», для Oil Rig — количество шерсти. */
function rankHint(skill: string, value: number): string {
  if (skill === 'Oil Rig') return `${value} Wool`;
  if (skill === 'Oil Extraction') return `+${value} нефти`;
  return `−${Math.round((1 - value) * 100)}%`;
}

function RankSelect({
  skill,
  target,
  value,
  onChange,
}: {
  skill: string;
  target: string;
  value: SkillRank;
  onChange: (v: SkillRank) => void;
}) {
  const ranks = skillRanks(skill);
  const icon = SKILL_ICONS[skill];
  return (
    <label className="ref-marvel-boost-check">
      {icon && <img src={icon} alt="" className="ref-marvel-icon ref-food-icon--sm" />}
      <span>
        {skill} <span className="ref-price-hint">({target})</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as SkillRank)}
        className="ref-food-rank-select"
      >
        <option value={0}>выкл</option>
        {ranks.map((r, i) => (
          <option key={i} value={i + 1}>
            ранг {i + 1} · {rankHint(skill, r)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="ref-marvel-boost-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <img src={icon} alt="" className="ref-marvel-icon ref-food-icon--sm" />
      <span>{label}</span>
    </label>
  );
}

export default function ToolCostCalculator() {
  const prices = useItemPrices(TOOL_PRICE_NAMES);
  const [boosts, setBoosts] = useState<ToolBoosts>(NO_TOOL_BOOSTS);
  const [amounts, setAmounts] = useState<Partial<Record<ToolName, number>>>({});

  const [oilBoosts, setOilBoosts] = useState<OilBoosts>(NO_OIL_BOOSTS);

  const setBoost = <K extends keyof ToolBoosts>(key: K, value: ToolBoosts[K]) =>
    setBoosts((prev) => ({ ...prev, [key]: value }));
  const setOilBoost = <K extends keyof OilBoosts>(key: K, value: OilBoosts[K]) =>
    setOilBoosts((prev) => ({ ...prev, [key]: value }));

  // Монеты → Flower по курсу монет (раздел «Курс монет»), чтобы у
  // инструмента была одна полная цена. null — курса нет, монеты не переводим.
  const { rate: coinRate } = useCoinRate();
  const coinsFlower = (coins: number) => (coinRate ? coinsToFlower(coins, coinRate) : null);

  // Нефть на маркетплейсе не торгуется — подставляем её себестоимость
  // (цена Oil Drill ÷ средний выход: ресурсы бура + его монеты по курсу),
  // чтобы Sand Drill считался целиком.
  const oilCost = oilUnitCost(boosts, oilBoosts);
  const oilResourcesFlower = prices ? oilFlowerPrice(oilCost, prices) : null;
  const oilFlower = oilResourcesFlower == null ? null : oilResourcesFlower + (coinsFlower(oilCost.coins) ?? 0);
  const effectivePrices = prices ? { ...prices, Oil: oilFlower } : null;

  const total = toolOrderTotal(amounts, boosts);
  const totalValue = effectivePrices ? resourcesFlowerValue(total.resources, effectivePrices) : null;
  const totalCoinsFlower = coinsFlower(total.coins);
  const totalOil = total.resources.Oil ?? 0;

  return (
    <div className="ref-tool-calc">
      <BoostPanel title="Бусты инструментов">
        <div className="ref-marvel-boost-widget">
          <div className="ref-food-boost-checks">
            <Check
              label="Artist — бейдж (−10% на всё)"
              icon="/sprites/icons/artist.png"
              checked={boosts.artist}
              onChange={(v) => setBoost('artist', v)}
            />
            <Check
              label="Salt Sculpture ур. 4+ (−10% Salt Rake)"
              icon="/sprites/sculptures/salt_sculpture_01.webp"
              checked={boosts.saltSculpture}
              onChange={(v) => setBoost('saltSculpture', v)}
            />
          </div>
          <div className="ref-food-boost-selects">
            {TOOL_SKILLS.map((s) => (
              <RankSelect
                key={s.key}
                skill={s.skill}
                target={s.target}
                value={boosts[s.key]}
                onChange={(v) => setBoost(s.key, v)}
              />
            ))}
          </div>
        </div>
      </BoostPanel>

      <div className="ref-table-wrap">
        <table className="ref-table ref-tool-table">
          <thead>
            <tr>
              <th>Инструмент</th>
              <th>Монеты за 1</th>
              <th>Ресурсы за 1</th>
              <th>Всего ≈ Flower</th>
              <th>Количество</th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group}>
                <tr className="ref-tool-group-row">
                  <td colSpan={5}>{TOOL_GROUP_LABELS[group]}</td>
                </tr>
                {TOOLS.filter((t) => t.group === group).map((tool) => {
                  const unit = toolUnitPrice(tool, boosts);
                  const ingredients = toolIngredients(tool, boosts);
                  const value = effectivePrices ? resourcesFlowerValue(ingredients, effectivePrices) : null;
                  const needsOil = 'Oil' in ingredients;
                  const hasIngredients = Object.keys(ingredients).length > 0;
                  const unitCoinsFlower = coinsFlower(unit);
                  // Полная цена 1 шт.: монеты по курсу + ресурсы по рынку (нефть — по себестоимости).
                  const loading = (hasIngredients && value == null) || coinRate === undefined;
                  const unitTotal = (unitCoinsFlower ?? 0) + (value?.value ?? 0);
                  const boosted = isToolBoosted(tool, boosts);
                  return (
                    <tr key={tool.name} className={amounts[tool.name] ? 'ref-tool-row--selected' : undefined}>
                      <td className="ref-table-name">
                        <span className="ref-tool-name">
                          <img src={tool.icon} alt="" className="ref-tool-icon" />
                          <span>
                            {tool.name}
                            <span className="ref-tool-sub">
                              {tool.labelRu}
                              {tool.requirement && ` · ${tool.requirement}`}
                              {tool.stock != null && ` · запас ${tool.stock}`}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="ref-tool-cell--coins">
                        <span className="ref-resource-chip">
                          <CoinsIcon />
                          {formatCoins(unit)}
                          {boosted && unit !== tool.price && (
                            <s className="ref-tool-old-price">{formatCoins(tool.price)}</s>
                          )}
                        </span>
                      </td>
                      <td className="ref-tool-cell--res">
                        <ResourceList resources={ingredients} />
                      </td>
                      <td className="ref-tool-cell--flower">
                        {loading
                          ? '…'
                          : unitTotal > 0
                            ? <FlowerAmount compact value={unitTotal} />
                            : 'нет данных'}
                        {value?.hasUnpriced && <span className="ref-price-hint"> + Oil</span>}
                        {coinRate === null && <span className="ref-tool-sub">без монет — нет курса</span>}
                        {needsOil && value && !value.hasUnpriced && (
                          <span className="ref-tool-sub">вкл. нефть по себестоимости</span>
                        )}
                      </td>
                      <td className="ref-tool-cell--qty">
                        <NumberStepper
                          value={amounts[tool.name] ?? 0}
                          min={0}
                          max={MAX_AMOUNT}
                          onChange={(v) => setAmounts((prev) => ({ ...prev, [tool.name]: v }))}
                        />
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <details className="ref-marvel-boost-widget ref-oil-cost">
        <summary className="ref-oil-cost-summary">
          <span>
            <img src={TOOL_RESOURCE_ICONS.Oil} alt="" className="gc-res-icon" />{' '}
            <strong>Нефть по себестоимости:</strong>{' '}
            {oilCost.free ? (
              'бесплатно (Infernal Drill)'
            ) : (
              <>
                1 шт ≈ {oilFlower == null ? (prices ? 'нет данных' : '…') : <FlowerAmount compact value={oilFlower} />}
                <span className="ref-price-hint">
                  {' '}(ресурсы бура + {formatCoins(oilCost.coins)} монет{coinRate ? ' по курсу' : ' — без курса не учтены'})
                </span>
              </>
            )}
          </span>
        </summary>
        <p className="ref-section-desc">
          Нефть не продаётся на маркетплейсе, поэтому считаем её через добычу: одно бурение скважины
          тратит 1 Oil Drill и даёт 10 нефти, каждое третье — ещё +20. В среднем сейчас{' '}
          <strong>{oilCost.perDrill.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} нефти</strong> с
          одного бура. Цена бура берётся из таблицы выше — с вашими скидками Artist и Oil Rig.
        </p>
        <div className="ref-food-boost-checks">
          {OIL_YIELD_BOOSTS.map((b) => (
            <Check
              key={b.key}
              label={`${b.label} (+${b.bonus.toLocaleString('ru-RU')})`}
              icon={b.icon}
              checked={oilBoosts[b.key]}
              onChange={(v) => setOilBoost(b.key, v)}
            />
          ))}
          <Check
            label="Stag Shrine (+15 на каждом 3-м)"
            icon="/sprites/sfts/shrines/stag_shrine.webp"
            checked={oilBoosts.stagShrine}
            onChange={(v) => setOilBoost('stagShrine', v)}
          />
          <Check
            label="Infernal Drill (бур не тратится)"
            icon="/sprites/wearables/370.webp"
            checked={oilBoosts.infernalDrill}
            onChange={(v) => setOilBoost('infernalDrill', v)}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            skill="Oil Extraction"
            target="+нефть"
            value={oilBoosts.oilExtraction}
            onChange={(v) => setOilBoost('oilExtraction', v)}
          />
        </div>
      </details>

      <div className="ref-marvel-boost-widget ref-tool-summary">
        {total.count === 0 ? (
          <p className="ref-section-desc">
            Укажите количество инструментов — здесь появится итог по монетам и ресурсам.
          </p>
        ) : (
          <>
            <p className="ref-tool-summary-line">
              <strong>Итого за {total.count.toLocaleString('ru-RU')} шт.:</strong>{' '}
              <span className="ref-resource-chip">
                <CoinsIcon />
                <strong>{formatCoins(total.coins)}</strong>
              </span>
            </p>
            <p className="ref-tool-summary-line">
              <span>Ресурсы:</span> <ResourceList resources={total.resources} />
            </p>
            {Object.keys(total.resources).length > 0 && (
              <p className="ref-tool-summary-line">
                <span>{totalOil > 0 ? 'Стоимость ресурсов:' : 'Рыночная стоимость ресурсов:'}</span>{' '}
                {totalValue == null
                  ? '…'
                  : totalValue.value > 0
                    ? <FlowerAmount value={totalValue.value} />
                    : 'нет данных'}
                {totalValue?.hasUnpriced && <span className="ref-price-hint"> (без Oil — нет цен для расчёта)</span>}
                {totalValue != null && totalValue.missing > 0 && (
                  <span className="ref-price-hint"> (у части ресурсов цена не найдена)</span>
                )}
              </p>
            )}
            <p className="ref-tool-summary-line ref-tool-summary-total">
              <span>Всего во Flower:</span>{' '}
              {totalValue == null || coinRate === undefined
                ? '…'
                : <FlowerAmount value={(totalCoinsFlower ?? 0) + totalValue.value} />}
              <span className="ref-price-hint">
                {coinRate
                  ? `(монеты по курсу 1 Flower ≈ ${Math.round(coinRate).toLocaleString('ru-RU')} + ресурсы)`
                  : '(монеты не учтены — нет курса)'}
              </span>
            </p>
            {totalOil > 0 && !oilCost.free && (
              <p className="ref-tool-summary-line ref-price-hint">
                В т.ч. {totalOil.toLocaleString('ru-RU')} нефти по себестоимости — это ≈{' '}
                {(totalOil / oilCost.perDrill).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} Oil Drill
                и {formatCoins(oilCost.coins * totalOil)} монет на них (уже в сумме).
              </p>
            )}
            <CoinRateNote rate={coinRate} />
            <button type="button" className="gc-btn-secondary ref-tool-reset" onClick={() => setAmounts({})}>
              Сбросить количество
            </button>
          </>
        )}
      </div>
    </div>
  );
}
