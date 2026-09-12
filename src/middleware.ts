import { defineMiddleware } from 'astro:middleware';
import { getEntry } from 'astro:content';
import { SECTIONS, sectionForHost, subdomainFor } from './lib/subdomains';

// Каждый раздел (blog/sfl/yakk) живёт на своём поддомене и отдаёт туда
// содержимое своего path (/news, /codex, /yakkamon) напрямую по корню, без
// видимого редиректа в адресной строке — только rewrite "/" на path раздела.
// На основном домене путь раздела больше не показывается — уводим 302 на
// поддомен тем же путём.
export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host');

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
