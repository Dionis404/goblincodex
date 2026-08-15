const ROUTERAI_BASE_URL = 'https://routerai.ru/api/v1';
const EMBEDDING_MODEL = 'qwen/qwen3-embedding-4b';

export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.ROUTERAI_API_KEY;
  if (!apiKey) throw new Error('ROUTERAI_API_KEY is not set');

  const res = await fetch(`${ROUTERAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`routerai embeddings request failed: ${res.status} ${body}`);
  }

  const data = await res.json() as { data: { embedding: number[] }[] };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) throw new Error('routerai embeddings response missing data[0].embedding');
  return embedding;
}
