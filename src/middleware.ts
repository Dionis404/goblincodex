import { defineMiddleware } from 'astro:middleware';
import { isBlogHost } from './lib/blog-domain';

// blog.goblincodex.fun/.ru больше не Teletype — этот же Astro-сервис отдаёт
// туда содержимое /news напрямую по корню, без видимого редиректа в адресной
// строке. news.astro сам выбирает минимальный BlogLayout по Host-заголовку —
// здесь только переписываем "/" на "/news" для этих хостов.
export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host');
  if (isBlogHost(host) && context.url.pathname === '/') {
    return context.rewrite('/news');
  }
  return next();
});
