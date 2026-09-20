/**
 * Расписание всех игровых глав Sunflower Land — даты старта/конца, номер,
 * название, тикет и артефакт главы.
 *
 * Источник: sunflower-land repo, src/features/game/types/chapters.ts
 * (CHAPTER_ORDER, CHAPTERS). Даты — ISO UTC, ровно как в коде игры, и идут
 * непрерывной шкалой без пропусков: endDate одной главы = startDate
 * следующей. Сверено с docs.sunflower-land.com/roadmap/chapters — даты
 * старта совпадают день-в-день для глав 2–6, 9–11 (единственное
 * расхождение — глава 1, где сам docs-сайт противоречит себе; код игры
 * остаётся источником истины, т.к. именно из него игра берёт даты в рантайме).
 *
 * У последних глав (13–15) в исходнике есть ещё tasksBegin — визуальная
 * дата открытия квестов главы (обычно на ~неделю позже startDate), это не
 * дата начала самой главы, здесь не хранится.
 */

export interface ChapterInfo {
  order: number;
  name: string;
  slug: string;
  startDate: string; // ISO UTC
  endDate: string;   // ISO UTC
  ticket: string;
  artifact: string;
}

export const CHAPTERS: ChapterInfo[] = [
  { order: 1,  name: 'Solar Flare',         slug: 'solar-flare',         startDate: '2023-01-01T00:00:00.000Z', endDate: '2023-05-01T00:00:00.000Z', ticket: 'Solar Flare Ticket', artifact: 'Scarab' },
  { order: 2,  name: 'Dawn Breaker',        slug: 'dawn-breaker',        startDate: '2023-05-01T00:00:00.000Z', endDate: '2023-08-01T00:00:00.000Z', ticket: 'Dawn Breaker Ticket', artifact: 'Scarab' },
  { order: 3,  name: "Witches' Eve",        slug: 'witches-eve',         startDate: '2023-08-01T00:00:00.000Z', endDate: '2023-11-01T00:00:00.000Z', ticket: 'Crow Feather', artifact: 'Scarab' },
  { order: 4,  name: 'Catch the Kraken',    slug: 'catch-the-kraken',    startDate: '2023-11-01T00:00:00.000Z', endDate: '2024-02-01T00:00:00.000Z', ticket: 'Mermaid Scale', artifact: 'Scarab' },
  { order: 5,  name: 'Spring Blossom',      slug: 'spring-blossom',      startDate: '2024-02-01T00:00:00.000Z', endDate: '2024-05-01T00:00:00.000Z', ticket: 'Tulip Bulb', artifact: 'Scarab' },
  { order: 6,  name: 'Clash of Factions',   slug: 'clash-of-factions',   startDate: '2024-05-01T00:00:00.000Z', endDate: '2024-08-01T00:00:00.000Z', ticket: 'Scroll', artifact: 'Scarab' },
  { order: 7,  name: "Pharaoh's Treasure",  slug: 'pharaohs-treasure',   startDate: '2024-08-01T00:00:00.000Z', endDate: '2024-11-01T00:00:00.000Z', ticket: 'Amber Fossil', artifact: 'Scarab' },
  { order: 8,  name: 'Bull Run',            slug: 'bull-run',            startDate: '2024-11-01T00:00:00.000Z', endDate: '2025-02-03T00:00:00.000Z', ticket: 'Horseshoe', artifact: 'Cow Skull' },
  { order: 9,  name: 'Winds of Change',     slug: 'winds-of-change',     startDate: '2025-02-03T00:00:00.000Z', endDate: '2025-05-01T00:00:00.000Z', ticket: 'Timeshard', artifact: 'Ancient Clock' },
  { order: 10, name: 'Great Bloom',         slug: 'great-bloom',         startDate: '2025-05-01T00:00:00.000Z', endDate: '2025-08-04T00:00:00.000Z', ticket: 'Geniseed', artifact: 'Broken Pillar' },
  { order: 11, name: 'Better Together',     slug: 'better-together',     startDate: '2025-08-04T00:00:00.000Z', endDate: '2025-11-03T00:00:00.000Z', ticket: 'Bracelet', artifact: 'Coprolite' },
  { order: 12, name: 'Paw Prints',          slug: 'paw-prints',          startDate: '2025-11-03T00:00:00.000Z', endDate: '2026-02-02T00:00:00.000Z', ticket: 'Pet Cookie', artifact: 'Moon Crystal' },
  { order: 13, name: 'Crabs and Traps',     slug: 'crabs-and-traps',     startDate: '2026-02-02T00:00:00.000Z', endDate: '2026-05-04T00:00:00.000Z', ticket: 'Floater', artifact: 'Ammonite Shell' },
  { order: 14, name: 'Salt Awakening',      slug: 'salt-awakening',      startDate: '2026-05-04T00:00:00.000Z', endDate: '2026-08-03T00:00:00.000Z', ticket: 'Salt Rock', artifact: 'Salt Dino Egg' },
  { order: 15, name: 'Ascension Age',       slug: 'ascension-age',       startDate: '2026-08-03T00:00:00.000Z', endDate: '2026-11-02T00:00:00.000Z', ticket: 'Shiny Feather', artifact: 'Otter Pebble' },
];

export function getCurrentChapter(now: Date = new Date()): ChapterInfo | undefined {
  const t = now.getTime();
  return CHAPTERS.find(c => t >= new Date(c.startDate).getTime() && t < new Date(c.endDate).getTime());
}

export function getPastChapters(now: Date = new Date()): ChapterInfo[] {
  const t = now.getTime();
  return CHAPTERS.filter(c => new Date(c.endDate).getTime() <= t);
}

export function getChapterBySlug(slug: string): ChapterInfo | undefined {
  return CHAPTERS.find(c => c.slug === slug);
}
