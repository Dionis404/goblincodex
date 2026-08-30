// Общий список доменов, на которых этот же Astro-сервис отдаёт содержимое
// /news под минимальным BlogLayout вместо обычной шапки/футера сайта.
// Используется и в middleware.ts (переписывает "/" на "/news" для этих
// хостов), и в src/pages/news.astro (выбирает layout по тому же Host) —
// единый источник, чтобы оба места не могли разойтись при добавлении домена.
export const BLOG_HOSTS = new Set(['blog.goblincodex.fun', 'blog.goblincodex.ru']);

export function isBlogHost(host: string | null): boolean {
  const normalized = host?.split(':')[0] ?? '';
  return BLOG_HOSTS.has(normalized);
}
