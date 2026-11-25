/**
 * Разбивка предметов главы на группы для вкладки главы
 * (src/components/ChapterContent.astro):
 *
 *   stella   — продаются у Стеллы за тикеты главы (megastore.ts в коде игры);
 *   auctions — разыгрываются на аукционах (определяется по живым данным
 *              расписания аукционов, список тут не нужен);
 *   mutants  — мутанты, марвелы и крафтовые предметы главы
 *              (chapterMutants.ts / crafting.ts / bumpkin.ts в коде игры).
 *
 * Источник списков — комментарии в scripts/lib/item-tags.ts, где предметы
 * тегируются по главам. Для новой главы достаточно дописать список сюда;
 * без записи глава деградирует в две группы (Stella + Аукционы).
 */
export const MUTANT_CRAFT_ITEMS: Record<string, string[]> = {
  // Cave Dwellers — chapterMutants.ts + крафт (Giant Truffle, Pig Plush,
  // Pig Doll) + аура (Firefly Aura, bumpkin.ts ITEM_IDS) + Mining Drill
  // (крафт за ресурсы главы, в мегасторе Стеллы его нет).
  'cave-dwellers': [
    'Mushroom Chicken',
    'Ladybug Cow',
    'Beetle Sheep',
    'Cyclops Bloom',
    'Manatee',
    'Betta',
    'Macropinna',
    'Giant Truffle',
    'Firefly Aura',
    'Pig Plush',
    'Pig Doll',
    'Mining Drill',
  ],
};

/**
 * Предметы мегастора Стеллы по главам (megastore.ts в коде игры,
 * CAVE_DWELLERS_ITEMS и т.д.). Часть предметов (хоургласы, Pot of Luck)
 * не имеет тега chapter-* в нашей БД — поэтому список явный, а не по тегу.
 */
export const STELLA_ITEMS: Record<string, string[]> = {
  'cave-dwellers': [
    'Duende Shoes',
    'Duende Pants',
    'Duende Shirt',
    'Gourmet Hourglass',
    'Ore Hourglass',
    'Timber Hourglass',
    'Blossom Hourglass',
    'Orchard Hourglass',
    "Fisher's Hourglass",
    'Harvest Hourglass',
    'Duende Hat',
    'Straw House',
    'Double Bed',
    'Duende Monument',
    'Pot of Luck',
  ],
};
