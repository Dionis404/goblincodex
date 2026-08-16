import { useEffect, useRef, useState } from 'react';
import './SearchWidget.css';

interface SearchResult {
  collection: 'guides' | 'mechanics' | 'reference';
  entryId: string;
  title: string;
  distance: number;
}

const COLLECTION_LABEL: Record<SearchResult['collection'], string> = {
  guides: 'Гайд',
  mechanics: 'Механика',
  reference: 'Справочник',
};

function resultHref(r: SearchResult): string {
  if (r.collection === 'mechanics') return `/codex?tab=mechanics&mech=${r.entryId}`;
  if (r.collection === 'reference') return `/codex?tab=reference&ref=${r.entryId}`;
  return `/codex/${r.entryId}`;
}

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export default function SearchWidget() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [rated, setRated] = useState<Record<string, 1 | -1>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(false);
      setHasSearched(false);
      setAnswer(null);
      setAnswerLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    setAnswer(null);
    setAnswerLoading(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      try {
        const res = await fetch(`/api/search.json?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (seq === requestSeq.current) {
          setResults(data.results ?? []);
          setLoading(false);
          setHasSearched(true);
        }
      } catch {
        if (seq === requestSeq.current) {
          setError(true);
          setLoading(false);
          setHasSearched(true);
        }
      }

      // Краткий ответ грузится отдельно и не блокирует список результатов —
      // это второй, более медленный вызов (эмбеддинг + генерация текста).
      try {
        const res = await fetch(`/api/search-answer.json?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (seq === requestSeq.current) {
          setAnswer(data.answer ?? null);
          setAnswerLoading(false);
        }
      } catch {
        if (seq === requestSeq.current) {
          setAnswer(null);
          setAnswerLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function rate(r: SearchResult, rating: 1 | -1) {
    const key = `${r.collection}:${r.entryId}`;
    if (rated[key]) return; // одна оценка на карточку за сессию
    setRated(prev => ({ ...prev, [key]: rating }));
    fetch('/api/search-feedback.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        collection: r.collection,
        entryId: r.entryId,
        title: r.title,
        rating,
      }),
    }).catch(() => {});
  }

  const showPanel = loading || hasSearched;

  return (
    <div className="gc-search-widget">
      <div className="gc-search-input-wrap">
        <span className="gc-search-icon">🔎</span>
        <input
          type="text"
          className="gc-search-input"
          placeholder="Спросите справочник своими словами…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading && <span className="gc-search-spinner" aria-hidden="true" />}
      </div>

      {showPanel && !loading && !error && (answerLoading || answer) && (
        <div className="gc-search-answer">
          {answerLoading ? (
            <span className="gc-search-answer-loading">
              <span className="gc-search-loading-icon" aria-hidden="true">🧙‍♂️</span>
              Гоблины формулируют ответ…
            </span>
          ) : (
            <>
              <span className="gc-search-answer-icon" aria-hidden="true">💡</span>
              <span className="gc-search-answer-text">{answer}</span>
            </>
          )}
        </div>
      )}

      {showPanel && (
        <div className="gc-search-results">
          {loading && (
            <div className="gc-search-loading">
              <span className="gc-search-loading-icon" aria-hidden="true">🧙‍♂️</span>
              Гоблины роются в архивах справочника…
            </div>
          )}
          {!loading && error && <div className="gc-search-empty">Поиск сейчас недоступен, попробуйте позже.</div>}
          {!loading && !error && results.length === 0 && (
            <div className="gc-search-empty">Ничего не нашлось — попробуйте переформулировать.</div>
          )}
          {!loading && !error &&
            results.map(r => {
              const key = `${r.collection}:${r.entryId}`;
              const href = resultHref(r);
              return (
                <div className="gc-search-result" key={key}>
                  <a href={href} className="gc-search-result-link">
                    <span className="gc-search-result-tag">
                      {COLLECTION_LABEL[r.collection]}
                    </span>
                    <span className="gc-search-result-title">{r.title}</span>
                  </a>
                  <div className="gc-search-rate">
                    <button
                      type="button"
                      className={`gc-search-rate-btn${rated[key] === 1 ? ' active' : ''}`}
                      disabled={!!rated[key]}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => rate(r, 1)}
                      aria-label="Полезно"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      className={`gc-search-rate-btn${rated[key] === -1 ? ' active' : ''}`}
                      disabled={!!rated[key]}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => rate(r, -1)}
                      aria-label="Не помогло"
                    >
                      👎
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
