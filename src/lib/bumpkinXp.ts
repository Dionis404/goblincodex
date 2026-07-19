/**
 * Опыт бампкина и прогрессия Возвышения (Ascension) — чистая логика.
 *
 * Источник: sunflower-land repo, src/features/game/lib/level.ts
 * (LEVEL_EXPERIENCE, bandXp/levelXp/ascensionBaseline). До 150 уровня опыт задан
 * фиксированной таблицей; после — каждое Возвышение открывает свою полосу из
 * 50 уровней с опытом, растущим ×1.45 от предыдущего Возвышения.
 */

/** Source: LEVEL_EXPERIENCE — level → cumulative experience. */
export const LEVEL_XP_RAW: [number, number][] = [
  [1, 0], [2, 2], [3, 22], [4, 205], [5, 555], [6, 1_155], [7, 2_155], [8, 3_405], [9, 5_405], [10, 7_905],
  [11, 10_905], [12, 14_405], [13, 18_405], [14, 22_905], [15, 27_905], [16, 33_655], [17, 40_155], [18, 47_405], [19, 55_405], [20, 64_155],
  [21, 73_905], [22, 84_655], [23, 96_405], [24, 109_155], [25, 122_905], [26, 137_405], [27, 152_905], [28, 169_405], [29, 186_905], [30, 205_405],
  [31, 225_405], [32, 246_905], [33, 269_905], [34, 294_405], [35, 320_405], [36, 348_405], [37, 378_405], [38, 410_405], [39, 444_405], [40, 480_405],
  [41, 518_905], [42, 559_905], [43, 603_405], [44, 649_405], [45, 697_905], [46, 749_405], [47, 803_905], [48, 861_405], [49, 921_905], [50, 985_405],
  [51, 1_053_905], [52, 1_127_405], [53, 1_205_905], [54, 1_289_405], [55, 1_377_905], [56, 1_476_405], [57, 1_584_905], [58, 1_703_405], [59, 1_831_905], [60, 1_970_405],
  [61, 2_128_905], [62, 2_287_405], [63, 2_485_905], [64, 2_704_405], [65, 2_942_905], [66, 3_221_405], [67, 3_539_905], [68, 3_898_405], [69, 4_296_905], [70, 4_735_405],
  [71, 5_233_905], [72, 5_743_905], [73, 6_263_905], [74, 6_793_905], [75, 7_333_905], [76, 7_883_905], [77, 8_443_905], [78, 9_013_905], [79, 9_593_905], [80, 10_183_905],
  [81, 10_783_905], [82, 11_393_905], [83, 12_013_905], [84, 12_643_905], [85, 13_283_905], [86, 13_933_905], [87, 14_593_905], [88, 15_263_905], [89, 15_943_905], [90, 16_633_905],
  [91, 17_333_905], [92, 18_043_905], [93, 18_763_905], [94, 19_493_905], [95, 20_233_905], [96, 20_983_905], [97, 21_743_905], [98, 22_513_905], [99, 23_293_905], [100, 24_083_905],
  [101, 24_893_905], [102, 25_723_905], [103, 26_573_905], [104, 27_443_905], [105, 28_333_905], [106, 29_243_905], [107, 30_173_905], [108, 31_123_905], [109, 32_093_905], [110, 33_083_905],
  [111, 34_093_905], [112, 35_123_905], [113, 36_173_905], [114, 37_243_905], [115, 38_333_905], [116, 39_443_905], [117, 40_573_905], [118, 41_723_905], [119, 42_893_905], [120, 44_083_905],
  [121, 45_293_905], [122, 46_523_905], [123, 47_773_905], [124, 49_043_905], [125, 50_333_905], [126, 51_653_905], [127, 53_003_905], [128, 54_383_905], [129, 55_793_905], [130, 57_233_905],
  [131, 58_708_905], [132, 60_218_905], [133, 61_763_905], [134, 63_343_905], [135, 64_958_905], [136, 66_613_905], [137, 68_308_905], [138, 70_043_905], [139, 71_818_905], [140, 73_633_905],
  [141, 75_493_905], [142, 77_398_905], [143, 79_348_905], [144, 81_343_905], [145, 83_383_905], [146, 85_473_905], [147, 87_613_905], [148, 89_803_905], [149, 92_043_905], [150, 94_333_905],
];

/** Bumpkin level cap before Возвышение (Ascension) takes over — level.ts: PRE_ASCENSION_MAX_LEVEL. */
export const PRE_ASCENSION_MAX_LEVEL = 150;

export interface LevelXpRow {
  level: number;
  total: number;
  delta: number;
}

export const LEVEL_XP_ROWS: LevelXpRow[] = LEVEL_XP_RAW.map(([level, total], i) => ({
  level,
  total,
  delta: i === 0 ? 0 : total - LEVEL_XP_RAW[i - 1][1],
}));

const LEVEL_XP_MAP: Record<number, number> = Object.fromEntries(LEVEL_XP_RAW);

/** Опыт, нужный для достижения обычного (доВозвышенского) уровня; уровень 1 = 0. */
export function xpForLevel(level: number): number {
  return LEVEL_XP_MAP[Math.min(Math.max(level, 1), PRE_ASCENSION_MAX_LEVEL)] ?? 0;
}

/** Обычный уровень (1..150) по накопленному опыту — без учёта Возвышения. */
export function levelForXp(experience: number): number {
  let level = 1;
  for (const [lvl, xp] of LEVEL_XP_RAW) {
    if (experience >= xp) level = lvl;
    else break;
  }
  return level;
}

/**
 * Ascension XP formula (level.ts: bandXp/levelXp) — each Возвышение band's total XP
 * grows ×1.45 over the previous, split across 49 within-band level-ups (0→50) with a
 * slight per-level weighting so later levels in a band cost a bit more than earlier ones.
 */
const ASCENSION_BAND_XP_BASE = 50_000_000;
const ASCENSION_BAND_XP_GROWTH = 1.45;
const ASCENSION_BAND_XP_ROUNDING = 5_000_000;
const ASCENSION_LEVEL_WEIGHT_PER_LEVEL = 0.03;
export const LEVELS_PER_ASCENSION = 50;
export const ASCENSION_LEVEL_UPS = LEVELS_PER_ASCENSION - 1;
const ASCENSION_TOTAL_WEIGHT =
  ASCENSION_LEVEL_UPS +
  ASCENSION_LEVEL_WEIGHT_PER_LEVEL * ((ASCENSION_LEVEL_UPS * LEVELS_PER_ASCENSION) / 2);

/** Общий опыт за одно Возвышение `ascension` (1-indexed), округлённый до 5 млн. */
export function ascensionBandXp(ascension: number): number {
  const raw = ASCENSION_BAND_XP_BASE * Math.pow(ASCENSION_BAND_XP_GROWTH, ascension - 1);
  return Math.round(raw / ASCENSION_BAND_XP_ROUNDING) * ASCENSION_BAND_XP_ROUNDING;
}

/** Опыт для перехода с внутриполосного уровня n → n+1 (n = 1..49) Возвышения `ascension`. */
export function ascensionLevelXp(ascension: number, n: number): number {
  return (ascensionBandXp(ascension) * (1 + ASCENSION_LEVEL_WEIGHT_PER_LEVEL * n)) / ASCENSION_TOTAL_WEIGHT;
}

/** Общий опыт (game.bumpkin.experience) на старте Возвышения `ascension` — level.ts: ascensionBaseline. */
export function ascensionBaseline(ascension: number): number {
  let xp = LEVEL_XP_MAP[PRE_ASCENSION_MAX_LEVEL];
  for (let b = 1; b < ascension; b++) {
    xp += ascensionBandXp(b);
  }
  return xp;
}

/** Накопленный опыт (от старта Возвышения `ascension`) на начало внутриполосного уровня `level` (1..50). */
export function ascensionCumulativeAtLevel(ascension: number, level: number): number {
  let cumulative = 0;
  for (let n = 1; n < Math.min(Math.max(level, 1), LEVELS_PER_ASCENSION); n++) {
    cumulative += ascensionLevelXp(ascension, n);
  }
  return cumulative;
}

export interface AscensionStanding {
  /** Внутриполосный уровень: 0, если опыта ещё не хватает на старт этого Возвышения. */
  level: number;
  currentProgress: number;
  experienceToNextLevel: number;
}

/** Внутриполосный уровень (0..50) и прогресс по общему опыту, при заданном числе пройденных Возвышений. */
export function ascensionStandingForXp(experience: number, ascension: number): AscensionStanding {
  const baseline = ascensionBaseline(ascension);
  if (experience < baseline) {
    return { level: 0, currentProgress: 0, experienceToNextLevel: baseline - experience };
  }
  let level = 1;
  let levelStart = baseline;
  for (let n = 1; n < ASCENSION_LEVEL_UPS; n++) {
    const nextStart = levelStart + ascensionLevelXp(ascension, n);
    if (experience >= nextStart) {
      level = n + 1;
      levelStart = nextStart;
    } else {
      break;
    }
  }
  if (level >= LEVELS_PER_ASCENSION) {
    const span = ascensionLevelXp(ascension, ASCENSION_LEVEL_UPS);
    return { level: LEVELS_PER_ASCENSION, currentProgress: span, experienceToNextLevel: span };
  }
  return {
    level,
    currentProgress: experience - levelStart,
    experienceToNextLevel: ascensionLevelXp(ascension, level),
  };
}
