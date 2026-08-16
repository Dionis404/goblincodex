import type { APIRoute } from 'astro';
import { getEmbedding, getChatCompletion } from '../../lib/routerai';
import { searchByEmbedding, type SearchResult } from '../../lib/db';
import { findEntry, stripMarkdown, REFERENCE_ENTRIES } from '../../lib/search-content';

export const prerender = false;

const CONTEXT_LIMIT = 4; // сколько топ-результатов передаём модели для ответа
const MAX_CONTEXT_CHARS_PER_ENTRY = 2500;

const SYSTEM_PROMPT = `Ты — справочный ассистент фан-сайта GoblinCodex по игре Sunflower Land.
Отвечай ТОЛЬКО на основе переданных ниже отрывков из справочника — не используй никакие другие знания об игре.
Если в отрывках нет ответа на вопрос, честно скажи: "Не нашёл ответа в справочнике." — не выдумывай.
Отвечай кратко, 1-3 предложения, на русском языке, без markdown-разметки.`;

function buildContext(result: SearchResult): string | null {
  if (result.collection === 'reference') {
    const ref = REFERENCE_ENTRIES.find(r => r.id === result.entryId);
    if (!ref) return null;
    return `### ${ref.title}\n${ref.context}`;
  }

  const entry = findEntry(result.collection, result.entryId);
  if (!entry) return null;
  const body = stripMarkdown(entry.body).slice(0, MAX_CONTEXT_CHARS_PER_ENTRY);
  return `### ${entry.title}\n${entry.description}\n${body}`;
}

export const GET: APIRoute = async ({ url }) => {
  const query = (url.searchParams.get('q') ?? '').trim();

  if (!query) {
    return new Response(JSON.stringify({ error: 'query param "q" is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    const embedding = await getEmbedding(query);
    const results = await searchByEmbedding(embedding, CONTEXT_LIMIT);

    const contexts = results.map(buildContext).filter((c): c is string => c !== null);

    if (contexts.length === 0) {
      return new Response(JSON.stringify({ query, answer: 'Не нашёл ответа в справочнике.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const userPrompt = `Вопрос: ${query}\n\nОтрывки из справочника:\n\n${contexts.join('\n\n')}`;
    const answer = await getChatCompletion(SYSTEM_PROMPT, userPrompt);

    return new Response(JSON.stringify({ query, answer }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    console.error('[api/search-answer] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};
