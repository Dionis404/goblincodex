import {
  VIP_EXPANSION_TIME_BOOST_END,
  type ExpansionBoosts,
} from '../lib/expansions';

/**
 * Чекбоксы бустов стоимости расширений (VIP и Grinx's Hammer) — общие для
 * таблиц в каталоге и калькулятора. Пересчёт делает applyExpansionBoosts
 * (src/lib/expansions.ts).
 */
export default function ExpansionBoostToggles({
  boosts,
  onChange,
}: {
  boosts: ExpansionBoosts;
  onChange: (next: ExpansionBoosts) => void;
}) {
  const timeBoostActive = Date.now() < VIP_EXPANSION_TIME_BOOST_END;
  return (
    <div className="ref-boost-toggles">
      <label className="ref-boost-toggle">
        <input
          type="checkbox"
          checked={boosts.vip}
          onChange={(e) => onChange({ ...boosts, vip: e.target.checked })}
        />
        <span className="ref-boost-icon ref-boost-icon--emoji" aria-hidden="true">👑</span>
        <strong>VIP</strong>
        <span>
          {timeBoostActive
            ? '−500 или −20% монет, −10% времени (до 2 ноября 2026)'
            : '−500 или −20% монет'}
        </span>
      </label>
      <label className="ref-boost-toggle">
        <input
          type="checkbox"
          checked={boosts.hammer}
          onChange={(e) => onChange({ ...boosts, hammer: e.target.checked })}
        />
        <img className="ref-boost-icon" src="/sprites/sfts/grinx_hammer.png" alt="" />
        <strong>Grinx's Hammer</strong>
        <span>−50% ресурсов (гемы не меняются)</span>
      </label>
      <label className="ref-boost-toggle">
        <input
          type="checkbox"
          checked={boosts.monument}
          onChange={(e) => onChange({ ...boosts, monument: e.target.checked })}
        />
        <img className="ref-boost-icon" src="/sprites/monuments/ascension_monument_stage3.webp" alt="" />
        <strong>Ascension Monument</strong>
        <span>−20% времени (монумент построен и заряжен)</span>
      </label>
    </div>
  );
}
