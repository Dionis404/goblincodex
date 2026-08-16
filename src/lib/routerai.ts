const ROUTERAI_BASE_URL = 'https://routerai.ru/api/v1';
const EMBEDDING_MODEL = 'qwen/qwen3-embedding-4b';
const CHAT_MODEL = 'google/gemma-3-27b-it';

// routerai.ru иногда отвечает 429 "Model busy, retry later" при перегрузке
// провайдера (DeepInfra) — временная проблема на их стороне, не в ключе/коде.
// Ретраим с задержкой вместо падения с первой попытки.
const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.ROUTERAI_API_KEY;
  if (!apiKey) throw new Error('ROUTERAI_API_KEY is not set');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS * attempt);

    const res = await fetch(`${ROUTERAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });

    if (res.ok) {
      const data = await res.json() as { data: { embedding: number[] }[] };
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) throw new Error('routerai embeddings response missing data[0].embedding');
      return embedding;
    }

    const body = await res.text().catch(() => '');
    lastError = new Error(`routerai embeddings request failed: ${res.status} ${body}`);

    // Перегрузка модели — стоит подождать и повторить. Остальные ошибки
    // (401 неверный ключ, 400 плохой запрос) ретраить бессмысленно.
    const retryable = res.status === 429 || res.status === 503 || body.includes('engine_overloaded');
    if (!retryable) throw lastError;
  }

  throw lastError ?? new Error('routerai embeddings request failed after retries');
}

export async function getChatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.ROUTERAI_API_KEY;
  if (!apiKey) throw new Error('ROUTERAI_API_KEY is not set');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS * attempt);

    const res = await fetch(`${ROUTERAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (res.ok) {
      const data = await res.json() as { choices: { message: { content: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('routerai chat completion response missing choices[0].message.content');
      return content.trim();
    }

    const body = await res.text().catch(() => '');
    lastError = new Error(`routerai chat completion request failed: ${res.status} ${body}`);

    const retryable = res.status === 429 || res.status === 503 || body.includes('engine_overloaded');
    if (!retryable) throw lastError;
  }

  throw lastError ?? new Error('routerai chat completion request failed after retries');
}
