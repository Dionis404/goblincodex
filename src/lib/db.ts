import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

let pool: InstanceType<typeof Pool> | null = null;
let telegramPostsTableReady: Promise<void> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

function ensureTelegramPostsTable(pool: InstanceType<typeof Pool>): Promise<void> {
  if (!telegramPostsTableReady) {
    telegramPostsTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_posts (
        id           BIGINT PRIMARY KEY,
        message_date TIMESTAMPTZ NOT NULL,
        text         TEXT NOT NULL,
        image_url    TEXT,
        created_at   TIMESTAMPTZ DEFAULT now()
      );
    `).then(() => undefined);
  }
  return telegramPostsTableReady;
}

interface SflBuff {
  id: number;
  labelType: 'info' | 'success' | 'vibrant' | 'danger';
  shortDescription: string;
  shortDescriptionRu: string;
  boostType: string | null;
  isDebuff: boolean;
  numericValue: number | null;
  valueType: string | null;
  affectedStat: string | null;
}

interface SflItem {
  name: string;
  type: 'collectible' | 'wearable';
  category: string | null;
  sprite: string | null;
  tags: string[];
  boosts: SflBuff[];
}

export async function getCatalogItems(): Promise<SflItem[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    name: string;
    type: string;
    category: string | null;
    sprite: string | null;
    tags: string[] | null;
    boosts: SflBuff[];
  }>(`
    SELECT
      i.id AS name,
      i.type,
      i.category,
      i.sprite,
      i.tags,
      COALESCE(
        json_agg(
          json_build_object(
            'id',                 b.id,
            'labelType',          b.label_type,
            'shortDescription',   b.short_description,
            'shortDescriptionRu', COALESCE(b.short_description_ru, b.short_description),
            'boostType',          b.boost_type,
            'isDebuff',           b.is_debuff,
            'numericValue',       b.numeric_value,
            'valueType',          b.value_type,
            'affectedStat',       b.affected_stat
          ) ORDER BY b.id
        ) FILTER (WHERE b.id IS NOT NULL AND b.is_active),
        '[]'
      ) AS boosts
    FROM sfl_items i
    LEFT JOIN sfl_buffs b ON b.item_id = i.id AND b.item_type = i.type
    WHERE i.type IN ('collectible', 'wearable')
      AND i.is_active = TRUE
    GROUP BY i.id, i.type, i.category, i.sprite, i.tags
    ORDER BY i.type, i.id
  `);

  return rows.map(r => ({
    name: r.name,
    type: r.type as 'collectible' | 'wearable',
    category: r.category,
    sprite: r.sprite,
    tags: r.tags ?? [],
    boosts: r.boosts ?? [],
  }));
}

export interface TelegramPost {
  id: number;
  date: Date;
  text: string;
  imageUrl: string | null;
}

export async function saveTelegramPost(post: TelegramPost): Promise<void> {
  const pool = getPool();
  await ensureTelegramPostsTable(pool);
  await pool.query(
    `INSERT INTO telegram_posts (id, message_date, text, image_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       message_date = EXCLUDED.message_date,
       text         = EXCLUDED.text,
       image_url    = EXCLUDED.image_url`,
    [post.id, post.date, post.text, post.imageUrl]
  );
}

export async function getTelegramPosts(limit: number): Promise<TelegramPost[]> {
  const pool = getPool();
  await ensureTelegramPostsTable(pool);
  const { rows } = await pool.query<{
    id: string;
    message_date: Date;
    text: string;
    image_url: string | null;
  }>(
    `SELECT id, message_date, text, image_url
     FROM telegram_posts
     ORDER BY message_date DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map(r => ({
    id: Number(r.id),
    date: r.message_date,
    text: r.text,
    imageUrl: r.image_url,
  }));
}
