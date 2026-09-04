import type { APIRoute } from 'astro';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { getEntryByShortId } from '../../../lib/news-lookup';

export const prerender = false;

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8' };

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;

  if (!id) {
    return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400, headers: jsonHeaders });
  }

  const entry = await getEntryByShortId(id);
  if (!entry || entry.data.draft) {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: jsonHeaders });
  }

  const processor = await createMarkdownProcessor();
  const { code: html } = await processor.render(entry.body ?? '');

  return new Response(JSON.stringify({
    title: entry.data.title,
    date: entry.data.date,
    category: entry.data.category,
    originalUrl: entry.data.originalUrl ?? null,
    html,
  }), {
    status: 200,
    headers: { ...jsonHeaders, 'Cache-Control': 'public, max-age=300' },
  });
};
