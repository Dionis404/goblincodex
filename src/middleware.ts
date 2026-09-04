import { defineMiddleware } from 'astro:middleware';
import { getEntry } from 'astro:content';
import { isBlogHost, blogHostFor } from './lib/blog-domain';

// blog.goblincodex.fun/.ru больше не Teletype — этот же Astro-сервис отдаёт
// туда содержимое /news напрямую по корню, без видимого редиректа в адресной
// строке. news.astro сам выбирает минимальный BlogLayout по Host-заголовку —
// здесь только переписываем "/" на "/news" для этих хостов.
export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get('host');

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
        const target = new URL(`/news/${shortId}`, `https://${blogHostFor(host)}`);
        return context.redirect(target.toString(), 301);
      }
    }
  }

  if (isBlogHost(host)) {
    if (context.url.pathname === '/') {
      return context.rewrite('/news');
    }
    return next();
  }

  // На основном домене /news больше не показывается — всё, что начинается
  // с /news (сама страница списка и /news/[id]), уводим на blog.<домен>
  // тем же путём. 302, не 301: домен ещё может измениться/добавиться,
  // не хотим, чтобы браузеры намертво закэшировали редирект.
  if (context.url.pathname === '/news' || context.url.pathname.startsWith('/news/')) {
    const target = new URL(context.url.pathname + context.url.search, `https://${blogHostFor(host)}`);
    return context.redirect(target.toString(), 302);
  }

  return next();
});
