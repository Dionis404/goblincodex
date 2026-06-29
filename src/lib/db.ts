import 'dotenv/config';
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

export interface SflBuff {
  id: number;
  labelType: 'info' | 'success' | 'vibrant' | 'danger';
  shortDescription: string;
  boostType: string | null;
  isDebuff: boolean;
  numericValue: number | null;
  valueType: string | null;
  affectedStat: string | null;
}

export interface SflItem {
  name: string;
  type: 'collectible' | 'wearable';
  category: string | null;
  sprite: string | null;
  boosts: SflBuff[];
}

export async function getCatalogItems(): Promise<SflItem[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    name: string;
    type: string;
    category: string | null;
    sprite: string | null;
    boosts: SflBuff[];
  }>(`
    SELECT
      i.id AS name,
      i.type,
      i.category,
      i.sprite,
      COALESCE(
        json_agg(
          json_build_object(
            'id',               b.id,
            'labelType',        b.label_type,
            'shortDescription', b.short_description,
            'boostType',        b.boost_type,
            'isDebuff',         b.is_debuff,
            'numericValue',     b.numeric_value,
            'valueType',        b.value_type,
            'affectedStat',     b.affected_stat
          ) ORDER BY b.id
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'
      ) AS boosts
    FROM sfl_items i
    LEFT JOIN sfl_buffs b ON b.item_id = i.id
    WHERE i.type IN ('collectible', 'wearable')
    GROUP BY i.id, i.type, i.category, i.sprite
    ORDER BY i.type, i.id
  `);

  return rows.map(r => ({
    name: r.name,
    type: r.type as 'collectible' | 'wearable',
    category: r.category,
    sprite: r.sprite,
    boosts: r.boosts ?? [],
  }));
}
