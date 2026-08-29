import * as fs from 'node:fs';
import * as path from 'node:path';

// Общая логика чтения контента для индексации (scripts/index-search.ts) и для
// сборки контекста ответа нейропоиска (api/search-answer.json.ts) — оба места
// должны видеть один и тот же текст статьи, иначе ответ может не совпадать
// с тем, что реально проиндексировано.

export interface ContentEntry {
  collection: 'guides' | 'mechanics' | 'news';
  id: string;
  title: string;
  description: string;
  body: string;
  draft: boolean;
}

// Плоский YAML-фронтматтер (как в src/content.config.ts) — своего парсера
// достаточно, без новой зависимости.
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    data[kv[1]] = value;
  }
  return { data, body: match[2] };
}

export function loadCollection(collection: 'guides' | 'mechanics' | 'news'): ContentEntry[] {
  const dir = path.resolve(`./src/content/${collection}`);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);
    // news-статьи используют slug из фронтматтера как id (совпадает с
    // именем файла по построению — см. scripts/import-teletype-news.ts),
    // у guides/mechanics id — это само имя файла.
    const id = collection === 'news' ? (data.slug ?? file.replace(/\.md$/, '')) : file.replace(/\.md$/, '');
    return {
      collection,
      id,
      title: data.title ?? file,
      description: data.description ?? '',
      body,
      draft: data.draft === 'true',
    };
  });
}

export function findEntry(collection: 'guides' | 'mechanics' | 'news', id: string): ContentEntry | undefined {
  return loadCollection(collection).find(e => e.id === id);
}

// Markdown-разметку убираем по-простому — заголовки/жирный/ссылки не несут
// смысла ни для эмбеддинга, ни для LLM-контекста, а только шумят токенами.
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Разделы src/components/ReferenceCatalog.tsx (REF_SECTIONS) — статичные
// React-таблицы, не content collection. summary — короткое описание для
// индексации (см. index-search.ts), context — более развёрнутый пересказ
// содержимого таблицы для передачи модели при генерации ответа. Держать
// id/label в синхроне с REF_SECTIONS при добавлении новых разделов.
export interface ReferenceEntry {
  id: string;
  title: string;
  summary: string;
  context: string;
}

export const REFERENCE_ENTRIES: ReferenceEntry[] = [
  {
    id: 'skills',
    title: 'Навыки',
    summary: 'деревья навыков бампкина, очки навыков, ранги, требования по уровню',
    context:
      'Раздел показывает деревья навыков бампкина: сколько очков навыков стоит каждый ранг, ' +
      'какой уровень бампкина требуется для разблокировки тира дерева, суммарно потрачено ' +
      'очков и осколков (shards) на выбранные ранги по каждому дереву.',
  },
  {
    id: 'expansions',
    title: 'Стоимость расширений',
    summary: 'цена и требования расширения острова по этапам, ресурсы на расширение',
    context:
      'Таблица стоимости расширения острова по этапам (stages) — сколько и каких ресурсов ' +
      'нужно на каждое следующее расширение земли, отдельно для острова и для Возвышения (Ascension).',
  },
  {
    id: 'levels',
    title: 'Опыт и Возвышение',
    summary: 'таблица опыта бампкина по уровням, опыт для Возвышения (Ascension), сколько XP нужно на уровень',
    context:
      'Таблица опыта бампкина: сколько XP нужно для каждого уровня до и после Возвышения ' +
      '(Ascension), сколько уровней даёт каждое повышение Ascension.',
  },
  {
    id: 'bait',
    title: 'Улов по наживке',
    summary:
      'какая рыба ловится на какую наживку, гарантированный улов, Fish Flake, Fish Stick, Fish Oil, Crab Stick, обычная продвинутая редкая рыба, на что ловить рыбу',
    context:
      'Таблица гарантированного улова по типу наживки: Fish Flake ловит обычную рыбу ' +
      '(Anchovy, Butterflyfish, Halibut, Blowfish, Porgy, Clownfish, Sea Bass, Sea Horse, Muskellunge, ' +
      'Horse Mackerel, Squid, Moray Eel, Olive Flounder, Tilapia, Napoleanfish, Surgeonfish, Zebra Turkeyfish, ' +
      'Walleye, Angelfish, Ray). Fish Stick ловит продвинутую рыбу (Rock Blackfish, Hammerhead shark, Tuna, ' +
      'Mahi Mahi, Blue Marlin, Weakfish, Oarfish, Football fish, Sunfish, Cobia). Fish Oil и Crab Stick ловят ' +
      'редкую рыбу (Barred Knifejaw, Trout, Coelacanth, Saw Shark для Fish Oil; Barred Knifejaw, Whale Shark, ' +
      'White Shark, Parrotfish для Crab Stick).',
  },
  {
    id: 'upgrades',
    title: 'Апгрейд ресурсов',
    summary: 'улучшение узлов ресурсов через обсидиан, стоимость апгрейда дерева камня золота железа',
    context:
      'Таблица апгрейда узлов ресурсов (дерево, камень, железо, золото) на тир 2 и тир 3 через ' +
      'обсидиан (Obsidian) — сколько исходных узлов, обсидиана и монет нужно на каждый апгрейд.',
  },
  {
    id: 'obsidian',
    title: 'Обсидиан (Lava Pit)',
    summary: 'рецепты Lava Pit по сезонам, что сдать чтобы получить обсидиан',
    context:
      'Рецепты Lava Pit (Огненная яма) по сезонам — какие культуры, ресурсы и их количество ' +
      'нужно сдать, чтобы получить обсидиан. Рецепт меняется каждый игровой сезон (осень, зима и т.д.).',
  },
  {
    id: 'marvels',
    title: 'Морские марвелы',
    summary:
      'морские существа марвелы, шанс улова рыбы марвелом, Crocodile Dumbo Octopus Seahorse Dad Crystal Shrimp Deep Sea Slug Deep Sea Pig Starlight Tuna, какая рыба ловится марвелом',
    context:
      'Таблица шансов улова редких морских существ — "марвелов" — в зависимости от типа рыбы. ' +
      'Марвелы текущей главы: Crocodile (ловится на Red Snapper 0.5% и Moray Eel 1.5%), Dumbo Octopus ' +
      '(Olive Flounder 0.5%, Napoleanfish 0.5%), Seahorse Dad (Angelfish 0.1%, Porgy 1%). Марвелы прошлой ' +
      'главы: Crystal Shrimp, Deep Sea Slug, Deep Sea Pig. Плюс базовые марвелы вроде Starlight Tuna.',
  },
  {
    id: 'food',
    title: 'Еда и готовка',
    summary: 'таблица блюд, время готовки, сытость, буст от еды, что приготовить',
    context:
      'Каталог блюд игры: время готовки, сколько опыта/сытости даёт блюдо, какие бусты применяет.',
  },
];
