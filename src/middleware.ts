import { defineMiddleware } from 'astro:middleware';
import { getEntry } from 'astro:content';
import { SECTIONS, sectionForHost, subdomainFor, isTestHost, isLocalHost, testSubdomainFor, mainDomainFor } from './lib/subdomains';
import { checkRateLimit, clientIp } from './lib/rate-limit';
import { warmupCaches } from './lib/warmup';

// Прогрев кэшей один раз на процесс — см. src/lib/warmup.ts.
let cacheWarmupStarted = false;

// Каждый раздел (blog/sfl/yakk) живёт на своём поддомене и отдаёт туда
// содержимое своего path (/news, /codex, /yakkamon) напрямую по корню, без
// видимого редиректа в адресной строке — только rewrite "/" на path раздела
// (дублирует rewrite в Caddy — подстраховка, если прокси-конфиг изменится).
// На основном домене путь раздела больше не показывается — уводим 302 на
// поддомен тем же путём.
export const onRequest = defineMiddleware(async (context, next) => {
  if (!cacheWarmupStarted) {
    cacheWarmupStarted = true;
    warmupCaches();
  }

  const host = context.request.headers.get('host');

  if (context.url.pathname.startsWith('/api/')) {
    let socketIp: string | undefined;
    try { socketIp = context.clientAddress; } catch { /* недоступен вне SSR */ }
    const limited = checkRateLimit(context.url.pathname, clientIp(context.request, socketIp));
    if (limited) return limited;
  }

  // Старый формат диплинка /news?article=<длинный-slug-или-shortId> — уводим
  // сразу на канонический /news/{shortId} до того, как запрос вообще дойдёт
  // до страницы /news (которая иначе отдала бы 200 с оверлеем на клиенте).
  // Специфично для news, на codex/yakkamon не распространяется.
  if (context.url.pathname === '/news') {
    const articleParam = context.url.searchParams.get('article');
    if (articleParam) {
      const entry = /^\d+$/.test(articleParam)
        ? undefined
        : await getEntry('news', articleParam);
      const shortId = entry && !entry.data.draft ? entry.data.shortId : (/^\d+$/.test(articleParam) ? articleParam : undefined);
      if (shortId != null) {
        const target = new URL(`/news/${shortId}`, `https://${subdomainFor(host, 'blog')}`);
        return context.redirect(target.toString(), 301);
      }
    }
  }

  const currentSection = sectionForHost(host);
  if (currentSection) {
    if (context.url.pathname === '/') {
      return context.rewrite(currentSection.path);
    }
    return next();
  }

  // Тестовый поддомен: корень показывает тестовую страницу /test (rewrite,
  // как у разделов), всё остальное — только на основном домене: уводим
  // туда же путём. Статика (_astro, images и т.п.) тоже пропускаем —
  // без неё страница не отрендерится.
  if (isTestHost(host)) {
    const path = context.url.pathname;
    if (path === '/') return context.rewrite('/test');
    if (path === '/test'
      || path.startsWith('/_astro/')
      || path.startsWith('/images/')
      || path.startsWith('/sprites/')
      || path.startsWith('/blog-images/')
      || path.match(/^\/(?:favicon|apple-touch-icon|og-default|robots)/)) {
      return next();
    }
    return context.redirect(`https://${mainDomainFor(host)}${path}${context.url.search}`, 302);
  }

  // Тестовая страница на основном домене не показывается — только на test.*
  // (локальный дев-хост пропускаем, чтобы страницу можно было смотреть в dev).
  if (context.url.pathname === '/test' && !isLocalHost(host)) {
    return context.redirect(`https://${testSubdomainFor(host)}/test`, 302);
  }

  // На основном домене ни один из путей разделов больше не показывается —
  // уводим на поддомен тем же путём. 302, не 301: поддомены/домены ещё
  // могут измениться/добавиться, не хотим, чтобы браузеры намертво
  // закэшировали редирект.
  for (const section of SECTIONS) {
    if (context.url.pathname === section.path || context.url.pathname.startsWith(`${section.path}/`)) {
      const target = new URL(context.url.pathname + context.url.search, `https://${subdomainFor(host, section.id)}`);
      return context.redirect(target.toString(), 302);
    }
  }

  return next();
});
