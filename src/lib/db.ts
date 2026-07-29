import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

let pool: InstanceType<typeof Pool> | null = null;
let telegramPostsTableReady: Promise<void> | null = null;
let telegramStatsTableReady: Promise<void> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    // Explicit cap (matches the pg driver default) so the limit is visible
    // here rather than implicit — this is the whole site's concurrency
    // budget against Postgres, shared across every page/route.
    pool = new Pool({ connectionString: url, max: 10 });
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

function ensureTelegramStatsTable(pool: InstanceType<typeof Pool>): Promise<void> {
  if (!telegramStatsTableReady) {
    telegramStatsTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS telegram_stats (
        channel      TEXT PRIMARY KEY,
        member_count INTEGER NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `).then(() => undefined);
  }
  return telegramStatsTableReady;
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

/**
 * Достаёт из short_description строки вида "10% chance...", "1/10 chance..."
 * или "+20% Chance of..." числовой % шанса (0-100). Возвращает null, если
 * в тексте нет распознаваемой формулировки шанса.
 */
function parseChancePercent(text: string): number | null {
  const fraction = text.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*chance/i);
  if (fraction) {
    return (100 * Number(fraction[1])) / Number(fraction[2]);
  }
  const percentBeforeChance = text.match(/(\d+(?:\.\d+)?)\s*%\s*chance/i);
  if (percentBeforeChance) return Number(percentBeforeChance[1]);

  const percentNearChance = text.match(/chance[^%\d]{0,20}(\d+(?:\.\d+)?)\s*%/i);
  if (percentNearChance) return Number(percentNearChance[1]);

  return null;
}

/**
 * Вытаскивает % шанса срабатывания для набора имён criticalHitName
 * (скиллы/предметы/постройки) из sfl_buffs — той же БД, что наполняется
 * скриптом sfl:populate из исходников игры. Так процент не рассинхронизируется
 * с реальными значениями при апдейтах игры вместо ручных констант в коде.
 */
export async function getPrngChances(names: string[]): Promise<Record<string, number>> {
  if (names.length === 0) return {};
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; short_description: string }>(
    `SELECT i.id, b.short_description
     FROM sfl_buffs b
     JOIN sfl_items i ON i.id = b.item_id AND i.type = b.item_type
     WHERE i.id = ANY($1) AND b.is_active AND b.short_description ILIKE '%chance%'`,
    [names]
  );

  const result: Record<string, number> = {};
  for (const row of rows) {
    const percent = parseChancePercent(row.short_description);
    if (percent !== null) result[row.id] = percent;
  }
  return result;
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

export async function saveTelegramSubscriberCount(channel: string, memberCount: number): Promise<void> {
  const pool = getPool();
  await ensureTelegramStatsTable(pool);
  await pool.query(
    `INSERT INTO telegram_stats (channel, member_count, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (channel) DO UPDATE SET
       member_count = EXCLUDED.member_count,
       updated_at   = now()`,
    [channel, memberCount]
  );
}

export async function getTelegramSubscriberCount(channel: string): Promise<number | null> {
  const pool = getPool();
  await ensureTelegramStatsTable(pool);
  const { rows } = await pool.query<{ member_count: number }>(
    `SELECT member_count FROM telegram_stats WHERE channel = $1`,
    [channel]
  );
  return rows[0]?.member_count ?? null;
}

// ─── Buds ───────────────────────────────────────────────────────────────────

export interface BudTrait {
  name: string;
  traitGroup: 'type' | 'stem' | 'aura';
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  labelType: string | null;
  boostType: string | null;
  isDebuff: boolean;
}

export async function getBudTraits(): Promise<BudTrait[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT id AS name, trait_group, sprite, description_en, description_ru, label_type, boost_type, is_debuff
    FROM sfl_buds
    WHERE is_active = TRUE
    ORDER BY trait_group, id
  `);
  return rows.map(r => ({
    name: r.name,
    traitGroup: r.trait_group,
    sprite: r.sprite,
    descriptionEn: r.description_en,
    descriptionRu: r.description_ru,
    labelType: r.label_type,
    boostType: r.boost_type,
    isDebuff: r.is_debuff,
  }));
}

export interface BudInstance {
  budId: number;
  type: string;
  colour: string;
  stem: string;
  aura: string;
  ears: string;
  imageUrl: string;
}

export async function getBudInstance(budId: number): Promise<BudInstance | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT bud_id, type, colour, stem, aura, ears, image_url
     FROM sfl_bud_instances
     WHERE bud_id = $1 AND is_active = TRUE`,
    [budId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    budId: r.bud_id,
    type: r.type,
    colour: r.colour,
    stem: r.stem,
    aura: r.aura,
    ears: r.ears,
    imageUrl: r.image_url,
  };
}

export async function getBudInstances(): Promise<BudInstance[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT bud_id, type, colour, stem, aura, ears, image_url
    FROM sfl_bud_instances
    WHERE is_active = TRUE
    ORDER BY bud_id
  `);
  return rows.map(r => ({
    budId: r.bud_id,
    type: r.type,
    colour: r.colour,
    stem: r.stem,
    aura: r.aura,
    ears: r.ears,
    imageUrl: r.image_url,
  }));
}

export interface BudFilterOptions {
  types: string[];
  colours: string[];
  stems: string[];
  auras: string[];
  ears: string[];
}

/**
 * Distinct trait values actually present across the 5000 minted Buds — not
 * every trait value has a buff (e.g. several stems and "No Aura"/"No Ears"
 * carry none), so this can't be derived from sfl_buds alone; it must reflect
 * what's really in sfl_bud_instances so filter dropdowns cover every Bud.
 */
export async function getBudFilterOptions(): Promise<BudFilterOptions> {
  const pool = getPool();
  const [types, colours, stems, auras, ears] = await Promise.all(
    (['type', 'colour', 'stem', 'aura', 'ears'] as const).map(col =>
      pool.query(`SELECT DISTINCT ${col} AS v FROM sfl_bud_instances WHERE is_active = TRUE ORDER BY ${col}`),
    ),
  );
  return {
    types: types.rows.map(r => r.v),
    colours: colours.rows.map(r => r.v),
    stems: stems.rows.map(r => r.v),
    auras: auras.rows.map(r => r.v),
    ears: ears.rows.map(r => r.v),
  };
}

export interface BudFilter {
  budId?: number;
  type?: string;
  colour?: string;
  stem?: string;
  aura?: string;
  ears?: string;
}

const BUD_FILTER_COLUMNS: Record<Exclude<keyof BudFilter, 'budId'>, string> = {
  type: 'type',
  colour: 'colour',
  stem: 'stem',
  aura: 'aura',
  ears: 'ears',
};

export async function searchBudInstances(
  filter: BudFilter,
  limit: number,
  offset: number,
): Promise<{ rows: BudInstance[]; total: number }> {
  const pool = getPool();
  const conditions = ['is_active = TRUE'];
  const params: unknown[] = [];

  if (filter.budId) {
    params.push(filter.budId);
    conditions.push(`bud_id = $${params.length}`);
  }

  for (const [key, column] of Object.entries(BUD_FILTER_COLUMNS) as [Exclude<keyof BudFilter, 'budId'>, string][]) {
    const value = filter[key];
    if (value) {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    }
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(`SELECT count(*) FROM sfl_bud_instances WHERE ${where}`, params);
  const total = Number(countResult.rows[0].count);

  const rowsParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT bud_id, type, colour, stem, aura, ears, image_url
     FROM sfl_bud_instances
     WHERE ${where}
     ORDER BY bud_id
     LIMIT $${rowsParams.length - 1} OFFSET $${rowsParams.length}`,
    rowsParams,
  );

  return {
    total,
    rows: rows.map(r => ({
      budId: r.bud_id,
      type: r.type,
      colour: r.colour,
      stem: r.stem,
      aura: r.aura,
      ears: r.ears,
      imageUrl: r.image_url,
    })),
  };
}

// ─── NFT pets ───────────────────────────────────────────────────────────────

export interface PetNftBreed {
  name: string;
  sprite: string | null;
  /** CDN image of one minted example of this breed — "sprite" (blank-{breed}.webp) is just an empty card background, not breed art. */
  sampleImageUrl: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
}

export async function getPetNftBreeds(): Promise<PetNftBreed[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      b.id AS name,
      b.sprite,
      b.description_en,
      b.description_ru,
      (
        SELECT i.image_url FROM sfl_pet_nft_instances i
        WHERE i.type = b.id AND i.is_active = TRUE
        ORDER BY i.pet_id
        LIMIT 1
      ) AS sample_image_url
    FROM sfl_pets_nft b
    WHERE b.is_active = TRUE
    ORDER BY b.id
  `);
  return rows.map(r => ({
    name: r.name,
    sprite: r.sprite,
    sampleImageUrl: r.sample_image_url,
    descriptionEn: r.description_en,
    descriptionRu: r.description_ru,
  }));
}

export interface PetNftTrait {
  name: string;
  traitGroup: 'aura' | 'bib';
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  labelType: string | null;
  boostType: string | null;
  isDebuff: boolean;
}

export async function getPetNftTraits(): Promise<PetNftTrait[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT id AS name, trait_group, sprite, description_en, description_ru, label_type, boost_type, is_debuff
    FROM sfl_pets_nft_traits
    WHERE is_active = TRUE
    ORDER BY trait_group, id
  `);
  return rows.map(r => ({
    name: r.name,
    traitGroup: r.trait_group,
    sprite: r.sprite,
    descriptionEn: r.description_en,
    descriptionRu: r.description_ru,
    labelType: r.label_type,
    boostType: r.boost_type,
    isDebuff: r.is_debuff,
  }));
}

export interface PetNftInstance {
  petId: number;
  type: string;
  fur: string;
  accessory: string;
  bib: string;
  aura: string;
  imageUrl: string;
}

export async function getPetNftInstance(petId: number): Promise<PetNftInstance | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT pet_id, type, fur, accessory, bib, aura, image_url
     FROM sfl_pet_nft_instances
     WHERE pet_id = $1 AND is_active = TRUE`,
    [petId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    petId: r.pet_id,
    type: r.type,
    fur: r.fur,
    accessory: r.accessory,
    bib: r.bib,
    aura: r.aura,
    imageUrl: r.image_url,
  };
}

export async function getPetNftInstances(): Promise<PetNftInstance[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT pet_id, type, fur, accessory, bib, aura, image_url
    FROM sfl_pet_nft_instances
    WHERE is_active = TRUE
    ORDER BY pet_id
  `);
  return rows.map(r => ({
    petId: r.pet_id,
    type: r.type,
    fur: r.fur,
    accessory: r.accessory,
    bib: r.bib,
    aura: r.aura,
    imageUrl: r.image_url,
  }));
}

export interface PetNftFilterOptions {
  types: string[];
  furs: string[];
  accessories: string[];
  bibs: string[];
  auras: string[];
}

/** Distinct trait values actually present across minted Pet NFTs (same rationale as getBudFilterOptions). */
export async function getPetNftFilterOptions(): Promise<PetNftFilterOptions> {
  const pool = getPool();
  const [types, furs, accessories, bibs, auras] = await Promise.all(
    (['type', 'fur', 'accessory', 'bib', 'aura'] as const).map(col =>
      pool.query(`SELECT DISTINCT ${col} AS v FROM sfl_pet_nft_instances WHERE is_active = TRUE ORDER BY ${col}`),
    ),
  );
  return {
    types: types.rows.map(r => r.v),
    furs: furs.rows.map(r => r.v),
    accessories: accessories.rows.map(r => r.v),
    bibs: bibs.rows.map(r => r.v),
    auras: auras.rows.map(r => r.v),
  };
}

export interface PetNftFilter {
  petId?: number;
  type?: string;
  fur?: string;
  accessory?: string;
  bib?: string;
  aura?: string;
}

const PET_NFT_FILTER_COLUMNS: Record<Exclude<keyof PetNftFilter, 'petId'>, string> = {
  type: 'type',
  fur: 'fur',
  accessory: 'accessory',
  bib: 'bib',
  aura: 'aura',
};

export async function searchPetNftInstances(
  filter: PetNftFilter,
  limit: number,
  offset: number,
): Promise<{ rows: PetNftInstance[]; total: number }> {
  const pool = getPool();
  const conditions = ['is_active = TRUE'];
  const params: unknown[] = [];

  if (filter.petId) {
    params.push(filter.petId);
    conditions.push(`pet_id = $${params.length}`);
  }

  for (const [key, column] of Object.entries(PET_NFT_FILTER_COLUMNS) as [Exclude<keyof PetNftFilter, 'petId'>, string][]) {
    const value = filter[key];
    if (value) {
      params.push(value);
      conditions.push(`${column} = $${params.length}`);
    }
  }

  const where = conditions.join(' AND ');

  const countResult = await pool.query(`SELECT count(*) FROM sfl_pet_nft_instances WHERE ${where}`, params);
  const total = Number(countResult.rows[0].count);

  const rowsParams = [...params, limit, offset];
  const { rows } = await pool.query(
    `SELECT pet_id, type, fur, accessory, bib, aura, image_url
     FROM sfl_pet_nft_instances
     WHERE ${where}
     ORDER BY pet_id
     LIMIT $${rowsParams.length - 1} OFFSET $${rowsParams.length}`,
    rowsParams,
  );

  return {
    total,
    rows: rows.map(r => ({
      petId: r.pet_id,
      type: r.type,
      fur: r.fur,
      accessory: r.accessory,
      bib: r.bib,
      aura: r.aura,
      imageUrl: r.image_url,
    })),
  };
}

// ─── Common (non-NFT) pets ──────────────────────────────────────────────────

export interface PetCommon {
  name: string;
  breed: string;
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
}

export async function getPetsCommon(): Promise<PetCommon[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT id AS name, breed, sprite, description_en, description_ru
    FROM sfl_pets_common
    WHERE is_active = TRUE
    ORDER BY breed, id
  `);
  return rows.map(r => ({
    name: r.name,
    breed: r.breed,
    sprite: r.sprite,
    descriptionEn: r.description_en,
    descriptionRu: r.description_ru,
  }));
}

// ─── Shared pet mechanics (span NFT + common pets) ─────────────────────────

export interface PetResource {
  resourceName: string;
  energyYield: number | null;
}

export interface PetFetch {
  petType: string;
  isNft: boolean;
  resourceName: string;
  unlockLevel: number;
}

export async function getPetResources(): Promise<PetResource[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT resource_name, energy_yield
    FROM sfl_pet_resources
    WHERE is_active = TRUE
    ORDER BY resource_name
  `);
  return rows.map(r => ({ resourceName: r.resource_name, energyYield: r.energy_yield }));
}

export async function getPetFetches(): Promise<PetFetch[]> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT pet_type, is_nft, resource_name, unlock_level
    FROM sfl_pet_fetches
    WHERE is_active = TRUE
    ORDER BY is_nft, pet_type, unlock_level
  `);
  return rows.map(r => ({
    petType: r.pet_type,
    isNft: r.is_nft,
    resourceName: r.resource_name,
    unlockLevel: r.unlock_level,
  }));
}
