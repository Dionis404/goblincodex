/**
 * classifyResource.ts
 * Infers which game resource a buff's short_description affects, by keyword.
 * Order matters: more specific resources (crimstone) are checked before
 * substrings that could collide (stone) — \b word boundaries keep
 * "Crimstone" from matching the "stone" rule anyway, but the explicit
 * ordering documents the intent.
 */

const RULES: Array<{ stat: string; pattern: RegExp }> = [
  { stat: "crimstone", pattern: /\bcrimstone\b/i },
  { stat: "gold", pattern: /\bgold\b/i },
  { stat: "iron", pattern: /\biron\b/i },
  { stat: "stone", pattern: /\bstone\b/i },
  { stat: "oil", pattern: /\boil\b/i },
  { stat: "wood", pattern: /\bwood\b/i },
  { stat: "xp", pattern: /\bxp\b|\bexperience\b/i },
  { stat: "coins", pattern: /\bcoins?\b/i },
  { stat: "crop", pattern: /\bcrops?\b/i },
];

/** Classify which resource a buff's short_description affects, or null if unrecognized. */
export function classifyResource(shortDescription: string): string | null {
  for (const { stat, pattern } of RULES) {
    if (pattern.test(shortDescription)) return stat;
  }
  return null;
}
