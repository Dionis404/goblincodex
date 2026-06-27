import pg from 'pg';

const { Pool } = pg;

let pool: InstanceType<typeof Pool> | null = null;

export function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export interface NftBoost {
  key: string;
  en: string;
  ru: string;
  type: 'success' | 'info' | 'vibrant' | 'danger';
  resource: string[];
  withSkill: boolean;
  value: Record<string, unknown> | null;
}

export interface NftItem {
  name: string;
  type: 'collectible' | 'wearable';
  description: { en: string; ru: string };
  sprite: string | null;
  tokenId: number;
  boosts: NftBoost[];
}

export async function getCatalogItems(): Promise<NftItem[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    name: string;
    type: string;
    description_en: string;
    description_ru: string;
    sprite: string | null;
    token_id: number;
    boosts: NftBoost[];
  }>(`
    SELECT
      i.name,
      i.type,
      COALESCE(i.description_en, '') AS description_en,
      COALESCE(i.description_ru, '') AS description_ru,
      i.sprite,
      i.token_id,
      COALESCE(
        json_agg(
          json_build_object(
            'key',       b.key,
            'en',        b.en,
            'ru',        b.ru,
            'type',      b.type,
            'resource',  b.resource,
            'withSkill', b.with_skill,
            'value',     b.value
          ) ORDER BY b.id
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'
      ) AS boosts
    FROM nft_items i
    LEFT JOIN nft_boosts b ON b.item_name = i.name
    GROUP BY i.name, i.type, i.description_en, i.description_ru, i.sprite, i.token_id
    ORDER BY i.name
  `);

  return rows.map(r => ({
    name: r.name,
    type: r.type as 'collectible' | 'wearable',
    description: { en: r.description_en, ru: r.description_ru },
    sprite: r.sprite,
    tokenId: r.token_id,
    boosts: r.boosts ?? [],
  }));
}
