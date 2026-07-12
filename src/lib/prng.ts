/**
 * Порт детерминированного PRNG из клиента Sunflower Land
 * (`_sfl_temp/src/lib/prng.ts`, 32-битный MurmurHash3-подобный алгоритм).
 *
 * Игра НЕ использует Math.random() для критов/бонусов на фарм-действиях —
 * исход полностью определяется farmId, itemId, счётчиком действия
 * (сколько раз игрок уже совершил именно это действие) и именем крит-эффекта.
 * Значит для одних и тех же входных данных результат всегда одинаковый,
 * и его можно посчитать заранее, не трогая сервер игры.
 */

function stringToInteger(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export type PrngInput = {
  farmId: number;
  itemId: number;
  counter: number;
  criticalHitName: string;
};

/** Возвращает псевдослучайное число в диапазоне [0, 1). */
export function prng({ farmId, itemId, counter, criticalHitName }: PrngInput): number {
  const criticalHitNameHash = stringToInteger(criticalHitName);

  const seed =
    (Math.imul(farmId, 0x85ebca6b) +
      Math.imul(itemId, 0x9e3779b9) +
      Math.imul(counter, 0x27d4eb2f) +
      Math.imul(criticalHitNameHash, 0x517cc1b7)) >>>
    0;

  let t = seed ^ (seed >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  t = t ^ (t >>> 15);

  return (t >>> 0) / 2 ** 32;
}

/** Сработал ли эффект с вероятностью `chance` (0-100 %) при данных входных параметрах. */
export function prngChance(input: PrngInput & { chance: number }): boolean {
  return prng(input) * 100 < input.chance;
}
