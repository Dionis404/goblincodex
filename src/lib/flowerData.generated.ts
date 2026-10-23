// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-flower-data.ts из исходников Sunflower Land
// (types/flowers.ts, types/seeds.ts) и таблицы рецептов scripts/data/flower-recipes.json.
// Не править руками — запустите `npm run sfl:sync-flowers` после `npm run sfl:clone`.

export interface FlowerSeedRecord {
  /** Цена семени в монетах. */
  price: number;
  /** Уровень Бампкина для покупки. */
  level: number;
  /** Дни роста без бустов. */
  days: number;
  /** Сезон года, в который семя продаётся; null — круглый год. */
  season: string | null;
  /** 1 — первый набор скрещиваемых предметов, 2 — второй. */
  set: 1 | 2;
  /** Цветы, которые вырастают из этого семени. */
  flowers: string[];
}

export const FLOWER_SEEDS: Record<string, FlowerSeedRecord> = {
  "Sunpetal Seed": {
    "price": 16,
    "level": 13,
    "days": 1,
    "season": null,
    "set": 1,
    "flowers": [
      "Red Pansy",
      "Yellow Pansy",
      "Purple Pansy",
      "White Pansy",
      "Blue Pansy",
      "Red Cosmos",
      "Yellow Cosmos",
      "Purple Cosmos",
      "White Cosmos",
      "Blue Cosmos",
      "Prism Petal"
    ]
  },
  "Bloom Seed": {
    "price": 32,
    "level": 22,
    "days": 2,
    "season": null,
    "set": 1,
    "flowers": [
      "Red Balloon Flower",
      "Yellow Balloon Flower",
      "Purple Balloon Flower",
      "White Balloon Flower",
      "Blue Balloon Flower",
      "Red Daffodil",
      "Yellow Daffodil",
      "Purple Daffodil",
      "White Daffodil",
      "Blue Daffodil",
      "Celestial Frostbloom"
    ]
  },
  "Lily Seed": {
    "price": 48,
    "level": 27,
    "days": 5,
    "season": null,
    "set": 1,
    "flowers": [
      "Red Carnation",
      "Yellow Carnation",
      "Purple Carnation",
      "White Carnation",
      "Blue Carnation",
      "Red Lotus",
      "Yellow Lotus",
      "Purple Lotus",
      "White Lotus",
      "Blue Lotus",
      "Primula Enigma"
    ]
  },
  "Lavender Seed": {
    "price": 96,
    "level": 35,
    "days": 3,
    "season": "spring",
    "set": 2,
    "flowers": [
      "Red Lavender",
      "Yellow Lavender",
      "Purple Lavender",
      "White Lavender",
      "Blue Lavender"
    ]
  },
  "Gladiolus Seed": {
    "price": 96,
    "level": 35,
    "days": 3,
    "season": "summer",
    "set": 2,
    "flowers": [
      "Red Gladiolus",
      "Yellow Gladiolus",
      "Purple Gladiolus",
      "White Gladiolus",
      "Blue Gladiolus"
    ]
  },
  "Clover Seed": {
    "price": 96,
    "level": 35,
    "days": 3,
    "season": "autumn",
    "set": 2,
    "flowers": [
      "Red Clover",
      "Yellow Clover",
      "Purple Clover",
      "White Clover",
      "Blue Clover"
    ]
  },
  "Edelweiss Seed": {
    "price": 96,
    "level": 35,
    "days": 3,
    "season": "winter",
    "set": 2,
    "flowers": [
      "Red Edelweiss",
      "Yellow Edelweiss",
      "Purple Edelweiss",
      "White Edelweiss",
      "Blue Edelweiss"
    ]
  }
};

/** Сколько штук предмета нужно для скрещивания: набор → предмет → количество. */
export const CROSSBREED_AMOUNTS: Record<1 | 2, Record<string, number>> = {
  "1": {
    "Sunflower": 50,
    "Potato": 20,
    "Pumpkin": 20,
    "Carrot": 10,
    "Cabbage": 10,
    "Beetroot": 10,
    "Cauliflower": 5,
    "Parsnip": 5,
    "Eggplant": 5,
    "Radish": 5,
    "Corn": 5,
    "Wheat": 5,
    "Kale": 5,
    "Blueberry": 3,
    "Orange": 3,
    "Apple": 3,
    "Banana": 3,
    "Red Pansy": 1,
    "Yellow Pansy": 1,
    "Purple Pansy": 1,
    "White Pansy": 1,
    "Blue Pansy": 1,
    "Red Cosmos": 1,
    "Yellow Cosmos": 1,
    "Purple Cosmos": 1,
    "White Cosmos": 1,
    "Blue Cosmos": 1,
    "Prism Petal": 1,
    "Red Balloon Flower": 1,
    "Yellow Balloon Flower": 1,
    "Purple Balloon Flower": 1,
    "White Balloon Flower": 1,
    "Blue Balloon Flower": 1,
    "Red Daffodil": 1,
    "Yellow Daffodil": 1,
    "Purple Daffodil": 1,
    "White Daffodil": 1,
    "Blue Daffodil": 1,
    "Celestial Frostbloom": 1,
    "Red Carnation": 1,
    "Yellow Carnation": 1,
    "Purple Carnation": 1,
    "White Carnation": 1,
    "Blue Carnation": 1,
    "Red Lotus": 1,
    "Yellow Lotus": 1,
    "Purple Lotus": 1,
    "White Lotus": 1,
    "Blue Lotus": 1,
    "Primula Enigma": 1
  },
  "2": {
    "Rhubarb": 25,
    "Pepper": 15,
    "Onion": 10,
    "Artichoke": 8,
    "Barley": 5,
    "Red Edelweiss": 1,
    "Yellow Edelweiss": 1,
    "Purple Edelweiss": 1,
    "White Edelweiss": 1,
    "Blue Edelweiss": 1,
    "Red Gladiolus": 1,
    "Yellow Gladiolus": 1,
    "Purple Gladiolus": 1,
    "White Gladiolus": 1,
    "Blue Gladiolus": 1,
    "Red Lavender": 1,
    "Yellow Lavender": 1,
    "Purple Lavender": 1,
    "White Lavender": 1,
    "Blue Lavender": 1,
    "Red Clover": 1,
    "Yellow Clover": 1,
    "Purple Clover": 1,
    "White Clover": 1,
    "Blue Clover": 1
  }
};

/** Цветок → предметы, из которых он получается (с семенем его группы). */
export const FLOWER_RECIPES: Record<string, string[]> = {
  "Red Pansy": [
    "Radish",
    "Banana",
    "Red Cosmos",
    "Purple Daffodil",
    "Red Balloon Flower",
    "Red Lotus",
    "Primula Enigma"
  ],
  "Yellow Pansy": [
    "Sunflower",
    "Apple",
    "Red Pansy",
    "Red Daffodil",
    "Yellow Balloon Flower",
    "Yellow Carnation"
  ],
  "Purple Pansy": [
    "Blue Pansy",
    "Purple Balloon Flower",
    "Purple Carnation"
  ],
  "White Pansy": [
    "Yellow Cosmos"
  ],
  "Blue Pansy": [
    "Purple Cosmos",
    "White Pansy",
    "White Cosmos",
    "White Daffodil",
    "Blue Daffodil",
    "White Carnation"
  ],
  "Red Cosmos": [
    "Yellow Daffodil",
    "Purple Lotus"
  ],
  "Yellow Cosmos": [
    "Yellow Pansy",
    "White Balloon Flower",
    "Red Carnation"
  ],
  "Purple Cosmos": [
    "Beetroot",
    "Eggplant",
    "Kale",
    "Blue Cosmos",
    "Blue Balloon Flower",
    "Celestial Frostbloom"
  ],
  "White Cosmos": [
    "Prism Petal",
    "Yellow Lotus"
  ],
  "Blue Cosmos": [
    "Cauliflower",
    "Parsnip",
    "Blueberry",
    "Purple Pansy",
    "White Lotus",
    "Blue Carnation"
  ],
  "Prism Petal": [
    "Blue Lotus"
  ],
  "Red Balloon Flower": [
    "Sunflower",
    "Beetroot",
    "Apple",
    "Banana",
    "Purple Pansy",
    "Red Pansy",
    "Red Daffodil",
    "Yellow Daffodil",
    "Purple Daffodil",
    "Yellow Carnation"
  ],
  "Yellow Balloon Flower": [
    "Yellow Lotus"
  ],
  "Purple Balloon Flower": [
    "Blue Carnation"
  ],
  "White Balloon Flower": [
    "White Cosmos",
    "Blue Daffodil",
    "White Daffodil",
    "White Balloon Flower"
  ],
  "Blue Balloon Flower": [
    "Cauliflower",
    "Parsnip",
    "Eggplant",
    "Kale",
    "Blue Pansy",
    "Blue Cosmos",
    "Purple Cosmos",
    "Blue Balloon Flower",
    "Celestial Frostbloom"
  ],
  "Red Daffodil": [
    "Yellow Pansy",
    "Yellow Balloon Flower",
    "Red Carnation",
    "Primula Enigma"
  ],
  "Yellow Daffodil": [
    "Red Cosmos",
    "White Carnation",
    "White Lotus"
  ],
  "Purple Daffodil": [
    "Radish",
    "Blueberry",
    "Red Balloon Flower",
    "Red Lotus",
    "Blue Lotus"
  ],
  "White Daffodil": [
    "Yellow Cosmos",
    "Prism Petal"
  ],
  "Blue Daffodil": [
    "Purple Balloon Flower",
    "Purple Carnation",
    "Purple Lotus"
  ],
  "Celestial Frostbloom": [
    "White Pansy"
  ],
  "Red Carnation": [
    "Purple Pansy"
  ],
  "Yellow Carnation": [
    "Sunflower",
    "Yellow Cosmos",
    "Red Lotus",
    "White Carnation"
  ],
  "Purple Carnation": [
    "Eggplant",
    "Blueberry",
    "Apple",
    "Blue Cosmos",
    "Blue Balloon Flower",
    "Purple Lotus"
  ],
  "White Carnation": [
    "Yellow Pansy",
    "White Cosmos",
    "Prism Petal",
    "Yellow Daffodil",
    "Celestial Frostbloom"
  ],
  "Blue Carnation": [
    "Purple Daffodil",
    "White Balloon Flower",
    "Primula Enigma"
  ],
  "Red Lotus": [
    "Beetroot",
    "Radish",
    "Purple Cosmos",
    "Red Balloon Flower",
    "Yellow Balloon Flower",
    "Purple Carnation",
    "Yellow Carnation",
    "Red Carnation"
  ],
  "Yellow Lotus": [
    "Red Pansy",
    "Red Cosmos",
    "Red Daffodil",
    "Yellow Lotus"
  ],
  "Purple Lotus": [
    "Blue Carnation"
  ],
  "White Lotus": [
    "Cauliflower",
    "Parsnip",
    "Kale",
    "Banana",
    "White Pansy",
    "Blue Daffodil",
    "Blue Lotus",
    "White Lotus"
  ],
  "Blue Lotus": [
    "Blue Pansy",
    "White Daffodil"
  ],
  "Primula Enigma": [
    "Purple Balloon Flower"
  ],
  "Red Edelweiss": [
    "Artichoke",
    "Barley",
    "Yellow Edelweiss",
    "Yellow Lavender",
    "Purple Lavender",
    "Red Clover"
  ],
  "Yellow Edelweiss": [
    "Onion",
    "Red Edelweiss",
    "Yellow Gladiolus",
    "Red Lavender",
    "White Lavender"
  ],
  "Purple Edelweiss": [
    "Rhubarb",
    "Pepper",
    "Red Gladiolus",
    "Purple Gladiolus",
    "Blue Gladiolus",
    "Blue Lavender",
    "Blue Clover"
  ],
  "White Edelweiss": [
    "Blue Edelweiss",
    "Yellow Clover"
  ],
  "Blue Edelweiss": [
    "Purple Edelweiss",
    "White Edelweiss",
    "White Gladiolus",
    "Purple Clover",
    "White Clover"
  ],
  "Red Gladiolus": [
    "Yellow Edelweiss"
  ],
  "Yellow Gladiolus": [
    "Pepper",
    "Onion",
    "Barley",
    "Yellow Gladiolus",
    "White Gladiolus",
    "Red Lavender",
    "Yellow Lavender",
    "White Lavender",
    "Yellow Clover"
  ],
  "Purple Gladiolus": [
    "Artichoke",
    "Red Edelweiss",
    "Red Gladiolus",
    "Purple Gladiolus",
    "Red Clover",
    "Purple Clover"
  ],
  "White Gladiolus": [
    "White Edelweiss",
    "Blue Edelweiss",
    "Blue Gladiolus"
  ],
  "Blue Gladiolus": [
    "Rhubarb",
    "Purple Edelweiss",
    "Purple Lavender",
    "Blue Lavender",
    "White Clover",
    "Blue Clover"
  ],
  "Red Lavender": [
    "Pepper",
    "Artichoke",
    "Red Edelweiss",
    "Purple Edelweiss",
    "Red Lavender",
    "Purple Lavender",
    "Yellow Clover"
  ],
  "Yellow Lavender": [
    "Red Gladiolus",
    "Yellow Gladiolus",
    "White Gladiolus",
    "Yellow Lavender",
    "Red Clover"
  ],
  "Purple Lavender": [
    "Blue Lavender",
    "Purple Gladiolus"
  ],
  "White Lavender": [
    "Rhubarb",
    "Onion",
    "Barley",
    "Yellow Edelweiss",
    "Blue Gladiolus",
    "White Lavender"
  ],
  "Blue Lavender": [
    "White Edelweiss",
    "Blue Edelweiss",
    "Purple Clover",
    "White Clover",
    "Blue Clover"
  ],
  "Red Clover": [
    "Red Edelweiss",
    "Purple Clover"
  ],
  "Yellow Clover": [
    "Pepper",
    "Onion",
    "Barley",
    "Yellow Edelweiss",
    "Red Gladiolus",
    "Yellow Lavender",
    "White Lavender",
    "Yellow Clover"
  ],
  "Purple Clover": [
    "Red Lavender",
    "Red Clover"
  ],
  "White Clover": [
    "Blue Edelweiss",
    "Yellow Gladiolus",
    "Blue Lavender"
  ],
  "Blue Clover": [
    "Rhubarb",
    "Artichoke",
    "Purple Edelweiss",
    "White Edelweiss",
    "Purple Gladiolus",
    "White Gladiolus",
    "Blue Gladiolus",
    "Purple Lavender",
    "White Clover",
    "Blue Clover"
  ]
};
