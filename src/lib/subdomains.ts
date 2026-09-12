// Единая карта разделов сайта, живущих на собственных поддоменах —
// blog.* (/news), sfl.* (/codex), yakk.* (/yakkamon). Используется и в
// middleware.ts (rewrite "/" на путь раздела на поддомене, редирект с
// основного домена), и в Header/Footer/страницах для построения
// кросс-доменных ссылок и подсветки активного раздела.
export type SectionId = 'blog' | 'sfl' | 'yakk';

export interface SectionConfig {
  id: SectionId;
  prefix: string; // поддоменный префикс: 'blog' | 'sfl' | 'yakk'
  path: string;   // путь на основном домене, который переехал на поддомен
  label: string;
}

export const SECTIONS: SectionConfig[] = [
  { id: 'blog', prefix: 'blog', path: '/news',     label: 'Новости и блог' },
  { id: 'sfl',  prefix: 'sfl',  path: '/codex',    label: 'Sunflower Land' },
  { id: 'yakk', prefix: 'yakk', path: '/yakkamon', label: 'Yakkamon' },
];

// Поддомены включены — DNS/инфра под sfl./yakk./blog.* настроены.
// middleware.ts тоже раскомментирован отдельно — при откате оба
// выключателя менять вместе (флаг здесь + return next() в middleware).
const SUBDOMAINS_ENABLED = true;

const HOST_TO_SECTION = new Map<string, SectionConfig>();
for (const section of SECTIONS) {
  HOST_TO_SECTION.set(`${section.prefix}.goblincodex.fun`, section);
  HOST_TO_SECTION.set(`${section.prefix}.goblincodex.ru`, section);
}

function normalizeHost(host: string | null): string {
  return host?.split(':')[0] ?? '';
}

function tldOf(host: string | null): 'fun' | 'ru' {
  return normalizeHost(host).endsWith('.ru') ? 'ru' : 'fun';
}

// Раздел, которому принадлежит текущий host, если это один из поддоменов
// (любого из трёх) — иначе null (основной домен, localhost и т.п.).
export function sectionForHost(host: string | null): SectionConfig | null {
  if (!SUBDOMAINS_ENABLED) return null;
  return HOST_TO_SECTION.get(normalizeHost(host)) ?? null;
}

export function isSectionHost(host: string | null, id: SectionId): boolean {
  return sectionForHost(host)?.id === id;
}

// Имя поддомена для раздела, сохраняя .fun/.ru зеркалирование текущего
// хоста — если зашли с *.ru, ссылки остаются на *.ru-зеркала.
export function subdomainFor(host: string | null, id: SectionId): string {
  const section = SECTIONS.find(s => s.id === id)!;
  return `${section.prefix}.goblincodex.${tldOf(host)}`;
}

// Абсолютный URL на главный домен (без поддоменного префикса) — нужен,
// когда мы уже находимся на поддомене раздела и должны сослаться на что-то,
// что живёт только на основном домене (главная, /community, /tools и т.д.).
export function mainDomainFor(host: string | null): string {
  return `goblincodex.${tldOf(host)}`;
}

// Полный href на путь внутри раздела (например /codex или /codex/some-guide)
// — абсолютный URL на поддомен, когда SUBDOMAINS_ENABLED, иначе обычный
// относительный путь на этом же домене. Используется везде, где строится
// прямая ссылка на конкретный путь раздела, а не просто на его корень
// (index.astro, ChapterContent.astro, profile/[username].astro).
export function sectionHref(host: string | null, id: SectionId, path: string): string {
  if (!SUBDOMAINS_ENABLED) return path;
  return `https://${subdomainFor(host, id)}${path}`;
}

export interface NavLink {
  slug: string;
  // Раздел, на чей поддомен указывает ссылка; null — ссылка внутри "сайта"
  // основного домена (главная, сообщество, инструменты, о проекте, поддержать).
  targetSection: SectionId | null;
  path: string;
  label: string;
}

// Резолвит абсолютный или относительный href для nav-ссылки в зависимости
// от текущего хоста: на каком бы поддомене/домене мы ни находились, ссылка
// должна вести на правильный публичный URL, а не резолвиться относительно
// текущего документа (что увело бы, например, "Сообщество" на sfl.*/community
// вместо goblincodex.fun/community).
export function resolveNavHref(host: string | null, link: NavLink): string {
  if (!SUBDOMAINS_ENABLED) return link.path;
  if (link.targetSection) {
    return `https://${subdomainFor(host, link.targetSection)}${link.path}`;
  }
  const currentSection = sectionForHost(host);
  if (currentSection) {
    return `https://${mainDomainFor(host)}${link.path}`;
  }
  return link.path;
}
