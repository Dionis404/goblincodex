import '../ReferenceCatalog.css';
import BOOST_ICONS from '../../lib/boostIcons.json';
import { SKILL_ICONS } from '../../lib/skills';
import BoostPanel from '../BoostPanel';
import type { TimeBoosts, XpBoosts } from '../../lib/food';

/**
 * Панели бустов еды: время готовки и опыт. Общие для таблицы блюд и
 * калькулятора опыта. Значения рангов — src/lib/skills.ts, формулы — src/lib/food.ts.
 */

/** Иконка навыка (SKILL_ICONS, src/lib/skills.ts) или предмета (boostIcons.json) по имени. */
export function BoostIcon({ name }: { name: string }) {
  const src = SKILL_ICONS[name] ?? (BOOST_ICONS as Record<string, string>)[name];
  if (!src) return null;
  return <img src={src} alt="" className="ref-marvel-icon ref-food-icon--sm" />;
}

export function RankSelect({
  label,
  icon,
  value,
  onChange,
  max = 3,
}: {
  label: string;
  icon?: string;
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  return (
    <label className="ref-marvel-boost-check">
      {icon && <BoostIcon name={icon} />}
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ref-food-rank-select"
      >
        <option value={0}>выкл</option>
        {Array.from({ length: max }, (_, i) => i + 1).map((r) => (
          <option key={r} value={r}>
            ранг {r}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="ref-marvel-boost-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {icon && <BoostIcon name={icon} />}
      <span>{label}</span>
    </label>
  );
}


export function TimeBoostsPanel({ boosts, onChange }: { boosts: TimeBoosts; onChange: (next: TimeBoosts) => void }) {
  return (
    <BoostPanel title="Бусты времени готовки">
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <Check
            label="Масло залито в здание"
            checked={boosts.oilFilled}
            onChange={(v) => onChange({ ...boosts, oilFilled: v })}
          />
          <Check
            label="Luna's Hat (×0.5)"
            icon="Luna's Hat"
            checked={boosts.lunasHat}
            onChange={(v) => onChange({ ...boosts, lunasHat: v })}
          />
          <Check
            label="Master Chef's Cleaver (×0.85)"
            icon="Master Chef's Cleaver"
            checked={boosts.chefsCleaver}
            onChange={(v) => onChange({ ...boosts, chefsCleaver: v })}
          />
          <Check
            label="Медальон фракции (×0.75)"
            icon="Sunflorian Medallion"
            checked={boosts.factionMedallion}
            onChange={(v) => onChange({ ...boosts, factionMedallion: v })}
          />
          <Check
            label="Super/Time Warp Totem (×0.5)"
            icon="Super Totem"
            checked={boosts.totem}
            onChange={(v) => onChange({ ...boosts, totem: v })}
          />
          <Check
            label="Desert Gnome (×0.9)"
            icon="Desert Gnome"
            checked={boosts.desertGnome}
            onChange={(v) => onChange({ ...boosts, desertGnome: v })}
          />
          <Check
            label="Legendary Shrine (×0.5)"
            icon="Legendary Shrine"
            checked={boosts.legendaryShrine}
            onChange={(v) => onChange({ ...boosts, legendaryShrine: v })}
          />
          <Check
            label="Boar Shrine (×0.8)"
            icon="Boar Shrine"
            checked={boosts.boarShrine}
            onChange={(v) => onChange({ ...boosts, boarShrine: v })}
          />
          <Check
            icon="Gourmet Hourglass"
            label="Gourmet Hourglass (×0.5)"
            checked={boosts.gourmetHourglass}
            onChange={(v) => onChange({ ...boosts, gourmetHourglass: v })}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            label="Fast Feasts (Fire Pit/Kitchen)"
            icon="Fast Feasts"
            value={boosts.fastFeastsRank}
            onChange={(v) => onChange({ ...boosts, fastFeastsRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Frosted Cakes (торты)"
            icon="Frosted Cakes"
            value={boosts.frostedCakesRank}
            onChange={(v) => onChange({ ...boosts, frostedCakesRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Swift Sizzle (масло, Fire Pit)"
            icon="Swift Sizzle"
            value={boosts.swiftSizzleRank}
            onChange={(v) => onChange({ ...boosts, swiftSizzleRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Turbo Fry (масло, Kitchen)"
            icon="Turbo Fry"
            value={boosts.turboFryRank}
            onChange={(v) => onChange({ ...boosts, turboFryRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Fry Frenzy (масло, Deli)"
            icon="Fry Frenzy"
            value={boosts.fryFrenzyRank}
            onChange={(v) => onChange({ ...boosts, fryFrenzyRank: v as 0 | 1 | 2 | 3 })}
          />
        </div>
      </div>
    </BoostPanel>
  );
}

export function XpBoostsPanel({ boosts, onChange }: { boosts: XpBoosts; onChange: (next: XpBoosts) => void }) {
  return (
    <BoostPanel title="Бусты опыта">
      <div className="ref-marvel-boost-widget">
        <div className="ref-food-boost-checks">
          <Check
            label="Golden Spatula (+10%)"
            icon="Golden Spatula"
            checked={boosts.goldenSpatula}
            onChange={(v) => onChange({ ...boosts, goldenSpatula: v })}
          />
          <Check
            label="Pan (+25%)"
            icon="Pan"
            checked={boosts.pan}
            onChange={(v) => onChange({ ...boosts, pan: v })}
          />
          <Check label="VIP Access (+10%)" checked={boosts.vip} onChange={(v) => onChange({ ...boosts, vip: v })} />
          <Check
            label="Observatory (+5%)"
            icon="Observatory"
            checked={boosts.observatory}
            onChange={(v) => onChange({ ...boosts, observatory: v })}
          />
          <Check
            label="Blossombeard (+10%)"
            icon="Blossombeard"
            checked={boosts.blossombeard}
            onChange={(v) => onChange({ ...boosts, blossombeard: v })}
          />
          <Check
            label="Grain Grinder (+20%, торты)"
            checked={boosts.grainGrinder}
            onChange={(v) => onChange({ ...boosts, grainGrinder: v })}
          />
          <Check
            label="Swiss Whiskers (+500 к блюдам с сыром)"
            icon="Swiss Whiskers"
            checked={boosts.swissWhiskers}
            onChange={(v) => onChange({ ...boosts, swissWhiskers: v })}
          />
          <Check
            label="Luminous Anglerfish Topper (+50%, рыба)"
            icon="Luminous Anglerfish Topper"
            checked={boosts.luminousAnglerfishTopper}
            onChange={(v) => onChange({ ...boosts, luminousAnglerfishTopper: v })}
          />
          <Check
            label="Skill Shrimpy (+20%, рыба)"
            icon="Skill Shrimpy"
            checked={boosts.skillShrimpy}
            onChange={(v) => onChange({ ...boosts, skillShrimpy: v })}
          />
        </div>
        <div className="ref-food-boost-selects">
          <RankSelect
            label="Munching Mastery (все блюда)"
            icon="Munching Mastery"
            value={boosts.munchingMasteryRank}
            onChange={(v) => onChange({ ...boosts, munchingMasteryRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Juicy Boost (Smoothie Shack)"
            icon="Juicy Boost"
            value={boosts.juicyBoostRank}
            onChange={(v) => onChange({ ...boosts, juicyBoostRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Drive-Through Deli"
            icon="Drive-Through Deli"
            value={boosts.driveThroughDeliRank}
            onChange={(v) => onChange({ ...boosts, driveThroughDeliRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Buzzworthy Treats (блюда с мёдом)"
            icon="Buzzworthy Treats"
            value={boosts.buzzworthyTreatsRank}
            onChange={(v) => onChange({ ...boosts, buzzworthyTreatsRank: v as 0 | 1 | 2 | 3 })}
          />
          <RankSelect
            label="Fishy Feast (рыба)"
            icon="Fishy Feast"
            value={boosts.fishyFeastRank}
            onChange={(v) => onChange({ ...boosts, fishyFeastRank: v as 0 | 1 | 2 | 3 })}
          />
          <label className="ref-marvel-boost-check">
            <span>Faction Pet (все блюда и рыба)</span>
            <select
              value={boosts.factionPetRank}
              onChange={(e) => onChange({ ...boosts, factionPetRank: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 })}
              className="ref-food-rank-select"
            >
              <option value={0}>выкл</option>
              <option value={1}>×1.1 · 2–3 недели подряд</option>
              <option value={2}>×1.2 · 4–5 недель</option>
              <option value={3}>×1.3 · 6–7 недель</option>
              <option value={4}>×1.5 · 8+ недель</option>
            </select>
          </label>
        </div>
      </div>
    </BoostPanel>
  );
}
