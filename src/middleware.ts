import { defineMiddleware } from 'astro:middleware';
import { getEntry } from 'astro:content';
import { checkRateLimit, clientIp } from './lib/rate-limit';

export const onRequest = defineMiddleware(async (context, next) => {
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
  if (context.url.pathname === '/news') {
    const articleParam = context.url.searchParams.get('article');
    if (articleParam) {
      const entry = /^\d+$/.test(articleParam)
        ? undefined
        : await getEntry('news', articleParam);
      const shortId = entry && !entry.data.draft ? entry.data.shortId : (/^\d+$/.test(articleParam) ? articleParam : undefined);
      if (shortId != null) {
        const target = new URL(`/news/${shortId}`, `https://${host}`);
        return context.redirect(target.toString(), 301);
      }
    }
  }

  return next();
});
