import * as fs from 'node:fs';
import * as path from 'node:path';
import { TOOLS } from './toolCosts';
import { SELLABLES } from './coinRate';
import { CRUSTACEAN_LOOKUP, FISH_RECORDS, GUARANTEED_CATCH, WATER_TRAPS } from './fishData.generated';
import { COMPOSTERS, COMPOST_RECIPES, COMPOSTER_BUILDINGS, WORM_AMOUNTS } from './composterData.generated';
import { BAIT_FAMILIES, FERMENTATION_RECIPES, SPICE_RACK_RECIPES } from './fermentationData.generated';
import { FLOWER_SEEDS, FLOWER_RECIPES, CROSSBREED_AMOUNTS } from './flowerData.generated';
import { FLOWER_POINTS, NPC_FLOWER_BONUSES, NPC_GIFTS } from './npcGiftData.generated';

// Общая логика чтения контента для индексации (scripts/index-search.ts) и для
// сборки контекста ответа нейропоиска (api/search-answer.json.ts) — оба места
// должны видеть один и тот же текст статьи, иначе ответ может не совпадать
// с тем, что реально проиндексировано.

export interface ContentEntry {
  collection: 'guides' | 'mechanics' | 'news' | 'yakkamon';
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

export function loadCollection(collection: 'guides' | 'mechanics' | 'news' | 'yakkamon'): ContentEntry[] {
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

export function findEntry(collection: 'guides' | 'mechanics' | 'news' | 'yakkamon', id: string): ContentEntry | undefined {
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
    id: 'tools',
    title: 'Стоимость инструментов',
    summary:
      'сколько стоит топор кирка удочка инструмент, цена инструментов в монетах и ресурсах, Workbench, скидки Feller\'s Discount Frugal Miner Reel Deal, Oil Drill, Crab Pot, Sand Shovel',
    context:
      'Калькулятор стоимости инструментов: цена 1 шт. в монетах и ресурсах, запас в магазине, ' +
      'итог за выбранное количество и рыночная стоимость ресурсов во Flower. Базовые цены: ' +
      TOOLS.map((t) => {
        const res = Object.entries(t.ingredients).map(([r, n]) => `${n} ${r}`).join(', ');
        return `${t.name} (${t.labelRu}) — ${t.price} монет${res ? ` + ${res}` : ''}`;
      }).join('; ') +
      '. Скидки умножаются: Feller\'s Discount на Axe ×0.8/×0.75/×0.7 по рангу, Frugal Miner на все кирки ' +
      '×0.8/×0.7/×0.6, Reel Deal на Rod ×0.5/×0.45/×0.4, Cheap Rakes на Salt Rake ×0.8/×0.7/×0.6, бейдж ' +
      'Artist ×0.9 на все инструменты, Salt Sculpture уровня 4+ ×0.9 на Salt Rake. Oil Rig заменяет 10 Leather ' +
      'в рецепте Oil Drill на 20/15/10 Wool. Нефть (Oil) на маркетплейсе не продаётся — калькулятор ' +
      'считает её себестоимость: цена Oil Drill делится на средний выход с бурения (10 нефти, каждое ' +
      'третье бурение +20, в среднем 16.67; бонусы Oil Overalls +10, Oil Gallon +5, Oil Can +2, ' +
      'Oil Extraction +1/1.5/2, Stag Shrine +15 на каждом третьем; с Infernal Drill бур не тратится).',
  },
  {
    id: 'coins',
    title: 'Курс монет',
    summary:
      'сколько стоят монеты во Flower, курс монет к Flower, цена монет, продажа урожая и фруктов Бетти, Coin Swindler, выгодно ли продавать Бетти',
    context:
      'Курс монет к Flower: урожай и фрукты можно продать Бетти за монеты или на маркетплейсе за Flower. ' +
      'Монет за 1 Flower = цена у Бетти ÷ floor-цена на рынке; курс — среднее по 3 самым выгодным предметам, ' +
      'максимум — самый выгодный обмен (купить на рынке и продать Бетти). Цены Бетти: ' +
      SELLABLES.map((s) => `${s.name} — ${s.sellPrice} монет`).join('; ') +
      '. Coin Swindler +10/20/30% и старый Green Thumb +5% — только для урожая, фрукты и теплица без бустов.',
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
    id: 'compost',
    title: 'Компостер',
    summary:
      'компостер, компост, черви, Compost Bin, Turbo Composter, Premium Composter, Sprout Mix, Fruitful Blend, Rapid Root, Earthworm, Grub, Red Wiggler, рецепты по сезонам, сколько стоит запуск компостера, ускорение яйцами',
    context:
      'Компостер перерабатывает урожай, фрукты и яйца в компост и червей-наживку. ' +
      Object.entries(COMPOSTERS).map(([name, c]) =>
        `${name} (постройка: ${Object.entries(COMPOSTER_BUILDINGS[name].ingredients).map(([i, n]) => `${n} ${i}`).join(' + ')}, уровень ${COMPOSTER_BUILDINGS[name].level}): ` +
        `за запуск ${c.produceAmount} ${c.produce} и червь ${c.worm} (${WORM_AMOUNTS[c.worm].join('/')} на выбор), готовка ${c.hours} ч, ускорение ${c.speedUpAmount} яиц срезает ${c.speedUpHours} ч. Для запуска: ` +
        Object.entries(COMPOST_RECIPES[name]).map(([season, recipe]) => `${season} — ${Object.entries(recipe).map(([i, n]) => `${n} ${i}`).join(' + ')}`).join('; '),
      ).join('. ') +
      '. Sprout Mix даёт +0,2 к урожаю с грядок, Fruitful Blend +0,1 к урожаю плодовых деревьев, Rapid Root сокращает рост на грядках на 50%. ' +
      'Бусты: Efficient Bin, Turbo Charged, Premium Worms, Composting Revamp, Turd Topper (больше компоста), Wormy Treat, Composting Overhaul, Bucket O Worms, Saw Fish, Deep Sea Slug (больше червей), Soil Krabby и Swift Decomposer (быстрее).',
  },
  {
    id: 'fermentation',
    title: 'Ферментация и специи',
    summary:
      'ферментация, сарай выдержки, Aging Shed, стойка ферментации, стойка специй, маринады, Pickled Radish, Pickled Zucchini, Pickled Tomato, Pickled Broccoli, Pickled Onion, Pickled Pepper, Refined Salt, Salt Lick, Honey Treat, Truffle Seasoning, Greenhouse Glow, Greenhouse Goodie, Sproutroot Surprise, Turbofruit Mix, Capsule Bait, Umbrella Bait, Crimson Baitfish, соль из водорослей, Ager, Refiner, Bacalhau, Astrolabe, Salt Bottle Onesie, рецепты, цены, бусты',
    context:
      'Стойки Aging Shed. Ферментация: ' +
      FERMENTATION_RECIPES.map((r) =>
        `${r.name} (${Object.entries(r.ingredients).map(([i, n]) => `${n} ${i}`).join(' + ')} → ${Object.entries(r.outputs).map(([i, n]) => `${n} ${i}`).join(' + ')}, ${r.seconds / 60} мин)`,
      ).join('; ') +
      '. Наживки: ' +
      BAIT_FAMILIES.map((f) => `${f.bait} — 1 Aged или Prime Aged рыба (${f.fishTier}) + маринад ${f.pickles.join(' или ')}, 5 наживки из Aged и 10 из Prime Aged`).join('; ') +
      '. Специи: ' +
      SPICE_RACK_RECIPES.map((r) =>
        `${r.name} (${Object.entries(r.ingredients).map(([i, n]) => `${n} ${i}`).join(' + ')} → ${Object.entries(r.outputs).map(([i, n]) => `${n} ${i}`).join(' + ')}, ${r.seconds / 60} мин)`,
      ).join('; ') +
      '. Бусты: Ager ×2/×3/×4 к выходу и расходу, Refiner шанс +1 Refined Salt, Bacalhau +1/+2/+3 к наживке, Astrolabe 15% удвоить выход, Salt Bottle Onesie +1 на стойке специй.',
  },
  {
    id: 'flowers',
    title: 'Цветы',
    summary:
      'цветы, рецепты цветов, скрещивание цветов, Sunpetal Seed, Bloom Seed, Lily Seed, Edelweiss Seed, Gladiolus Seed, Lavender Seed, Clover Seed, Pansy, Cosmos, Balloon Flower, Daffodil, Carnation, Lotus, Prism Petal, Celestial Frostbloom, Primula Enigma, из чего получить цветок, сколько стоит посадка цветка',
    context:
      'Цветы растут из семян на грядках для цветов; к семени добавляют предмет для скрещивания (урожай, фрукт или цветок), и от него зависит результат. ' +
      Object.entries(FLOWER_SEEDS).map(([seed, s]) =>
        `${seed} (уровень ${s.level}, ${s.price} монет, растёт ${s.days} дн.${s.season ? `, только сезон ${s.season}` : ''}): ` +
        s.flowers.map((f) => `${f} — ${FLOWER_RECIPES[f].map((i) => `${CROSSBREED_AMOUNTS[s.set][i]} ${i}`).join(' или ')}`).join('; '),
      ).join('. ') + '.',
  },
  {
    id: 'bait',
    title: 'Рыбалка',
    summary:
      'рыбалка, какая рыба ловится на какую наживку, гарантированный улов, Fish Flake, Fish Stick, Fish Oil, Crab Stick, Earthworm, Grub, Red Wiggler, Fishing Lure, сезоны рыбы, приманка chum, марвелы и куски карты, на что ловить рыбу',
    context:
      'Справочник рыбалки. Гарантированная наживка (выбираешь рыбу из списка, она клюёт наверняка, chum с ней ' +
      'использовать нельзя): ' +
      Object.entries(GUARANTEED_CATCH).map(([bait, fish]) => `${bait} — ${fish.join(', ')}`).join('; ') +
      '. Обычная рыба (ранг; наживка; сезоны; любимая приманка chum): ' +
      FISH_RECORDS.filter((f) => f.type !== 'chapter').map((f) =>
        `${f.name} (${f.type}; ${f.baits.join('/')}; ${f.seasons.length === 4 ? 'круглый год' : f.seasons.join('/')}; ${f.likes.join('/') || 'нет'})`,
      ).join('; ') +
      '. Гарантия — это наживка, приманка (chum) лишь повышает шанс. Куски карт марвелов — в разделе «Морские марвелы». ' +
      'Точные шансы улова знает только сервер игры. ' +
      'Цена наживок по рецепту (Fish Flake, Fish Stick, Fish Oil, Crab Stick): рыба на маркетплейсе не торгуется, ' +
      'её цена — себестоимость заброса удочки (20 монет, 3 Wood, 1 Stone), делённая на рыбу за заброс с бонусами ' +
      '(Walrus +1, Trident 20% +1, Sunflower Rod 10% +1, Alba, Fishy Chance/Roll/Gamble, сезонные марвелы; Ancient Rod ' +
      'делает удочку бесплатной). Crab оценивается по цене продажи 15 монет. ' +
      'Раки (Crab Pot и Mariner Pot) — в отдельном разделе «Раки».',
  },
  {
    id: 'npcgifts',
    title: 'Подарки NPC',
    summary:
      'подарки NPC, подарить цветы, любимые цветы NPC, очки дружбы, друзья NPC, Betty, Bert, Finley, Raven, Miranda, Old Salty, Finn, Corale, Cornwell, Tywin, Victoria, Jester, Pumpkin Pete, Blacksmith, какой цветок дарить, награды за дружбу, Blossom Bonding, кому дарить цветы',
    context:
      'Цветы можно дарить NPC, чтобы получать очки дружбы; за очки NPC дарят награды. Очки за цветок = базовые очки + бонус любимого цветка NPC + Blossom Bonding. ' +
      'Базовые очки: Pansy и Cosmos — 3, Balloon Flower и Carnation — 5, Daffodil и Lotus — 7, Edelweiss, Gladiolus, Lavender, Clover — 4, Prism Petal, Celestial Frostbloom, Primula Enigma — ' + FLOWER_POINTS['Prism Petal'] + '. ' +
      Object.entries(NPC_FLOWER_BONUSES).map(([npc, b]) =>
        `${npc} любит: ${Object.entries(b).map(([f, n]) => `${f} +${n}`).join(', ')}`,
      ).join('; ') +
      '. Награды за дружбу: ' +
      Object.entries(NPC_GIFTS).map(([npc, g]) =>
        `${npc} — пороги ${g.planned.map((x) => x.friendshipPoints).join('/')}, затем каждые ${g.repeats.friendshipPoints} очков`,
      ).join('; ') +
      '. Цена цветка — себестоимость выращивания; выгоднее дарить цветок с наибольшим числом очков на 1 Flower.',
  },
  {
    id: 'crustaceans',
    title: 'Раки',
    summary:
      'раки, ракообразные, Crab Pot, Mariner Pot, приманка для раков, chum, ловушки для раков, стоимость установки ловушки, что попадётся в Crab Pot, Fish Stick Fish Oil Crab Stick для раков',
    context:
      'Раки (ракообразные) попадают в ловушки без случайности: ловушка + приманка → ровно одно существо. ' +
      Object.entries(CRUSTACEAN_LOOKUP).map(([pot, rows]) =>
        `${pot} (уровень ${WATER_TRAPS[pot].level}, ${WATER_TRAPS[pot].readyHours} ч): ` +
        Object.entries(rows).map(([chum, name]) =>
          `${name} — ${chum === 'none' ? 'без приманки' : `${WATER_TRAPS[pot].chums[chum]} ${chum}`}`,
        ).join(', '),
      ).join('. ') +
      '. Стоимость установки — ловушка плюс приманка; ловушка тратится при каждой установке (кроме Royal Crab Pot).',
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
      'главы: Crystal Shrimp, Deep Sea Slug, Deep Sea Pig. Плюс базовые марвелы вроде Starlight Tuna. ' +
      'Глава 16 Cave Dwellers (старт 2 ноября 2026): марвелы Manatee, Betta, Macropinna уже есть в коде игры, ' +
      'но на какую рыбу они ловятся, пока неизвестно; Macropinna даёт +0,1 Obsidian в Lava Pit.',
  },
  {
    id: 'food',
    title: 'Еда и готовка',
    summary: 'таблица блюд, время готовки, сытость, буст от еды, что приготовить',
    context:
      'Каталог блюд игры: время готовки, сколько опыта/сытости даёт блюдо, какие бусты применяет.',
  },
];
