// Faithful port of the Bud boost formulas from the SFL client:
//   src/features/game/lib/getBudYieldBoosts.ts
//   src/features/game/lib/getBudSpeedBoosts.ts
//   src/features/game/lib/getBudExperienceBoosts.ts
//
// The game's real rule: when multiple Buds are placed, boosts do NOT stack —
// for each resource, only the single strongest placed Bud's boost applies
// (Math.max for yield/xp, Math.min for the speed multiplier). Two Buds
// "work together" when they cover different resource categories (each is
// the best for its own category); they "don't work together" when they
// compete for the same category — the weaker one is simply wasted there,
// never additive, never penalized.
//
// This module reduces that per-resource logic to a fixed set of resource
// *categories* actually referenced in the game's boost conditions (rather
// than enumerating every literal crop/resource name), so two arbitrary Buds
// can be compared without needing the full crop-tier dataset.

export interface BudBoostTraits {
  type: string;
  stem: string;
  aura: string;
}

export function budAuraMultiplier(aura: string): number {
  if (aura === "Basic") return 1.05;
  if (aura === "Green") return 1.2;
  if (aura === "Rare") return 2;
  if (aura === "Mythical") return 5;
  return 1; // "No Aura"
}

export type BudBoostKind = "yield" | "speed" | "xp" | "chance";

export interface BudBoostCategory {
  key: string;
  label: string;
  kind: BudBoostKind;
  typeBoost: (type: string) => number;
  stemBoost: (stem: string) => number;
}

export const BUD_BOOST_CATEGORIES: BudBoostCategory[] = [
  {
    key: "stone", label: "Камень", kind: "yield",
    typeBoost: t => (t === "Cave" ? 0.2 : 0),
    stemBoost: s => (s === "Diamond Gem" ? 0.2 : s === "Ruby Gem" ? 0.2 : 0),
  },
  {
    key: "iron", label: "Железо", kind: "yield",
    typeBoost: t => (t === "Cave" ? 0.2 : 0),
    stemBoost: s => (s === "Diamond Gem" ? 0.2 : s === "Miner Hat" ? 0.2 : 0),
  },
  {
    key: "gold", label: "Золото", kind: "yield",
    typeBoost: t => (t === "Cave" ? 0.2 : 0),
    stemBoost: s => (s === "Diamond Gem" ? 0.2 : s === "Gold Gem" ? 0.2 : 0),
  },
  {
    key: "sunflower", label: "Подсолнух", kind: "yield",
    typeBoost: t => (t === "Plaza" ? 0.3 : 0),
    stemBoost: s => (s === "3 Leaf Clover" ? 0.5 : s === "Basic Leaf" ? 0.2 : s === "Sunflower Hat" ? 0.5 : 0),
  },
  {
    key: "carrot", label: "Морковь", kind: "yield",
    typeBoost: t => (t === "Plaza" ? 0.3 : 0),
    stemBoost: s => (s === "3 Leaf Clover" ? 0.5 : s === "Basic Leaf" ? 0.2 : s === "Carrot Head" ? 0.3 : 0),
  },
  {
    key: "basic-crop", label: "Другие базовые культуры", kind: "yield",
    typeBoost: t => (t === "Plaza" ? 0.3 : 0),
    stemBoost: s => (s === "3 Leaf Clover" ? 0.5 : s === "Basic Leaf" ? 0.2 : 0),
  },
  {
    key: "medium-crop", label: "Средние культуры", kind: "yield",
    typeBoost: t => (t === "Castle" ? 0.3 : 0),
    stemBoost: s => (s === "3 Leaf Clover" ? 0.5 : 0),
  },
  {
    key: "advanced-crop", label: "Продвинутые культуры", kind: "yield",
    typeBoost: t => (t === "Snow" ? 0.3 : 0),
    stemBoost: s => (s === "3 Leaf Clover" ? 0.5 : 0),
  },
  {
    key: "wood", label: "Древесина", kind: "yield",
    typeBoost: t => (t === "Woodlands" ? 0.2 : 0),
    stemBoost: s => (s === "Acorn Hat" ? 0.1 : s === "Tree Hat" ? 0.2 : 0),
  },
  {
    key: "wild-mushroom", label: "Дикий гриб", kind: "yield",
    typeBoost: () => 0,
    stemBoost: s => (s === "Mushroom" ? 0.3 : 0),
  },
  {
    key: "magic-mushroom", label: "Волшебный гриб", kind: "yield",
    typeBoost: () => 0,
    stemBoost: s => (s === "Magic Mushroom" ? 0.2 : 0),
  },
  {
    key: "egg", label: "Яйцо", kind: "yield",
    typeBoost: t => (t === "Retreat" ? 0.2 : 0),
    stemBoost: s => (s === "Egg Head" ? 0.2 : 0),
  },
  {
    key: "fruit", label: "Фрукты", kind: "yield",
    typeBoost: t => (t === "Beach" ? 0.2 : 0),
    stemBoost: s => (s === "Banana" ? 0.2 : s === "Apple Head" ? 0.2 : 0),
  },
  {
    key: "animal-produce", label: "Продукция животных (кроме яиц)", kind: "yield",
    typeBoost: t => (t === "Retreat" ? 0.2 : 0),
    stemBoost: () => 0,
  },
  {
    key: "crop-speed", label: "Скорость роста культур", kind: "speed",
    typeBoost: t => (t === "Saphiro" ? 0.1 : 0),
    stemBoost: () => 0,
  },
  {
    key: "fish-xp", label: "Опыт за рыбные блюда", kind: "xp",
    typeBoost: t => (t === "Port" ? 0.1 : 0),
    stemBoost: () => 0,
  },
  // Не подтверждено клиентским кодом (расчёт улова — на сервере, budBuffs.ts
  // содержит только текст тултипа "10% шанс получить +1 рыбу"), но по факту
  // игры так же взаимоисключающе, как и детерминированные бонусы: два Bud с
  // Type="Sea" и/или Stem="Fish Hat" не увеличивают шанс дважды.
  {
    key: "fish-chance", label: "Доп. шанс поймать +1 рыбу (Sea / Fish Hat)", kind: "chance",
    typeBoost: t => (t === "Sea" ? 1 : 0),
    stemBoost: s => (s === "Fish Hat" ? 1 : 0),
  },
];

/** Raw category value — meaning depends on `kind` (see isCategoryActive/formatCategoryValue). */
export function computeBudCategoryValue(bud: BudBoostTraits, cat: BudBoostCategory): number {
  const t = cat.typeBoost(bud.type);
  const s = cat.stemBoost(bud.stem);

  // "chance" isn't a verified formula (see fish-chance category comment) — no
  // aura scaling, value is just a count of matching sub-traits (0/1/2), used
  // only to rank which Bud "wins" when both qualify.
  if (cat.kind === "chance") return t + s;

  const aura = budAuraMultiplier(bud.aura);
  if (cat.kind === "speed") return 1 - aura * t; // < 1 means faster
  if (cat.kind === "xp") return 1 + aura * t; // > 1 means bonus XP
  return aura * (t + s); // > 0 means yield bonus
}

export function isBudCategoryActive(kind: BudBoostKind, value: number): boolean {
  if (kind === "speed") return value < 1;
  if (kind === "xp") return value > 1;
  return value > 0; // yield & chance
}

export function formatBudCategoryValue(kind: BudBoostKind, value: number): string {
  if (kind === "speed") return isBudCategoryActive(kind, value) ? `-${((1 - value) * 100).toFixed(1)}%` : "—";
  if (kind === "xp") return isBudCategoryActive(kind, value) ? `+${((value - 1) * 100).toFixed(1)}%` : "—";
  if (kind === "chance") {
    if (!isBudCategoryActive(kind, value)) return "—";
    return value >= 2 ? "есть (Type + Stem)" : "есть";
  }
  return isBudCategoryActive(kind, value) ? `+${(value * 100).toFixed(1)}%` : "—";
}

