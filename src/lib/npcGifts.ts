/**
 * Подарки цветов NPC: сколько очков дружбы получает NPC за цветок, какие
 * цветы он любит особо, какой цветок выгоднее дарить и сколько цветов нужно
 * до награды.
 *
 * Очки за цветок (giftFlowers.ts): базовые очки цветка + Blossom Bonding
 * (+2/+3/+4 за ранг навыка) + бонус конкретного NPC за любимый цветок.
 * Данные — из npcGiftData.generated.ts (scripts/sync-npc-gift-data.ts).
 *
 * Цена цветка — себестоимость его выращивания (flowers.ts), цветы на
 * маркете не торгуются. «Выгодность» — очки дружбы на 1 Flower себестоимости.
 */
import { FLOWER_POINTS, NPC_FLOWER_BONUSES, NPC_GIFTS, NPC_NAMES, type NpcGift } from './npcGiftData.generated';
import { flowerSkillValues } from './flowers';
import type { SkillRank } from './toolCosts';

export { NPC_NAMES };

/** «pumpkin' pete» → «Pumpkin' Pete». */
export function npcLabel(npc: string): string {
  return npc.replace(/(^|\s)(\S)/g, (_, space: string, ch: string) => space + ch.toUpperCase());
}

/** Бонус очков за подарок от навыка Blossom Bonding по рангу. */
export function blossomBonus(rank: SkillRank): number {
  return rank === 0 ? 0 : (flowerSkillValues('Blossom Bonding')[rank - 1] ?? 0);
}

export interface GiftRow {
  flower: string;
  base: number;
  /** Бонус NPC за любимый цветок (0 — обычный). */
  bonus: number;
  /** Очки от Blossom Bonding. */
  skill: number;
  points: number;
  /** Себестоимость цветка; null — не посчитать. */
  cost: number | null;
  /** Дни до цветка по самой быстрой цепочке; null — не посчитать. */
  days: number | null;
  /** Очков дружбы на 1 Flower себестоимости; null — не посчитать. */
  value: number | null;
}

export type GiftSort = 'value' | 'points' | 'fast';

export function giftRows(
  npc: string,
  costs: Record<string, number>,
  times: Record<string, number>,
  blossomRank: SkillRank,
): GiftRow[] {
  const skill = blossomBonus(blossomRank);
  return Object.keys(FLOWER_POINTS).map((flower): GiftRow => {
    const base = FLOWER_POINTS[flower];
    const bonus = NPC_FLOWER_BONUSES[npc]?.[flower] ?? 0;
    const points = base + skill + bonus;
    const cost = costs[flower] ?? null;
    return {
      flower,
      base,
      bonus,
      skill,
      points,
      cost,
      days: times[flower] ?? null,
      value: cost != null && cost > 0 ? points / cost : null,
    };
  });
}

/** Лучшие строки вперёд; без данных — в конец. */
export function sortGiftRows(rows: GiftRow[], sort: GiftSort): GiftRow[] {
  const num = (v: number | null, dir: 1 | -1) => (v == null ? Infinity : v * dir);
  const cmp = (a: GiftRow, b: GiftRow): number => {
    if (sort === 'points') return b.points - a.points || num(b.value, -1) - num(a.value, -1);
    // Среди одинаково быстрых — больше очков, затем выгоднее.
    if (sort === 'fast') return num(a.days, 1) - num(b.days, 1) || b.points - a.points || num(a.value, -1) - num(b.value, -1);
    return num(a.value, -1) - num(b.value, -1) || b.points - a.points;
  };
  return [...rows].sort(cmp);
}

/** Любимые цветы NPC: чем больше бонус, тем выше. */
export function favoriteFlowers(npc: string): { flower: string; bonus: number }[] {
  return Object.entries(NPC_FLOWER_BONUSES[npc] ?? {})
    .map(([flower, bonus]) => ({ flower, bonus }))
    .sort((a, b) => b.bonus - a.bonus);
}

export interface NpcBest {
  /** Самый выгодный по очкам на Flower. */
  value: GiftRow | null;
  /** Больше всего очков за один цветок (при равенстве — выгоднее). */
  points: GiftRow | null;
  /** Самый быстрый цветок (при равенстве времени — больше очков). */
  fast: GiftRow | null;
}

export function bestFor(rows: GiftRow[]): NpcBest {
  return {
    value: sortGiftRows(rows, 'value').find((r) => r.value != null) ?? null,
    points: sortGiftRows(rows, 'points')[0] ?? null,
    fast: sortGiftRows(rows, 'fast').find((r) => r.days != null) ?? null,
  };
}

export interface Milestone {
  /** Очки дружбы, при которых награда доступна. */
  points: number;
  gift: NpcGift;
  /** true — это повторяющаяся награда после всех запланированных. */
  repeating: boolean;
}

/** Пороги наград по возрастанию: запланированные, затем несколько повторов. */
export function milestones(npc: string, repeatsShown = 2): Milestone[] {
  const g = NPC_GIFTS[npc];
  if (!g) return [];
  const planned = [...g.planned].sort((a, b) => a.friendshipPoints - b.friendshipPoints);
  const out: Milestone[] = planned.map((gift) => ({ points: gift.friendshipPoints, gift, repeating: false }));
  const last = planned[planned.length - 1].friendshipPoints;
  for (let k = 1; k <= repeatsShown; k++) {
    out.push({ points: last + k * g.repeats.friendshipPoints, gift: g.repeats, repeating: true });
  }
  return out;
}

/** Шаг повторяющейся награды (очков между наградами после последней запланированной). */
export function repeatStep(npc: string): number | null {
  return NPC_GIFTS[npc]?.repeats.friendshipPoints ?? null;
}

/** Сколько цветков по pointsPerFlower нужно, чтобы добрать очки до порога. */
export function flowersToReach(threshold: number, current: number, pointsPerFlower: number): number {
  const need = Math.max(0, threshold - current);
  return pointsPerFlower > 0 ? Math.ceil(need / pointsPerFlower) : 0;
}

/** Текст награды: монеты, предметы, одежда, рецепт. */
export function describeGift(gift: NpcGift): string[] {
  const parts: string[] = [];
  if (gift.coins > 0) parts.push(`${gift.coins.toLocaleString('ru-RU')} монет`);
  for (const [name, n] of Object.entries(gift.items)) parts.push(`${n > 1 ? `${n}× ` : ''}${name}`);
  for (const [name, n] of Object.entries(gift.wearables)) parts.push(`${n > 1 ? `${n}× ` : ''}${name} (одежда)`);
  if (gift.recipe) parts.push(`рецепт: ${gift.recipe}`);
  return parts;
}
