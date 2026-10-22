// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-composter-data.ts из исходников Sunflower Land
// (types/composters.ts, events/landExpansion/composterBait.ts, types/buildings.ts).
// Не править руками — запустите `npm run sfl:sync-composter` после `npm run sfl:clone`.

export interface ComposterRecord {
  /** Червь, который выпадает при сборе (Earthworm | Grub | Red Wiggler). */
  worm: string;
  /** Компост, который делает компостер. */
  produce: string;
  /** Сколько компоста за запуск без бустов. */
  produceAmount: number;
  /** Часы готовки без бустов. */
  hours: number;
  /** Сколько яиц нужно для ускорения (с Feathery Business — перьев). */
  speedUpAmount: number;
  /** На сколько часов ускорение сокращает готовку. */
  speedUpHours: number;
}

export interface BuildingRecord {
  level: number;
  coins: number;
  /** Часы строительства. */
  hours: number;
  ingredients: Record<string, number>;
}

export const COMPOSTERS: Record<string, ComposterRecord> = {
  "Compost Bin": {
    "worm": "Earthworm",
    "produce": "Sprout Mix",
    "produceAmount": 10,
    "hours": 6,
    "speedUpAmount": 10,
    "speedUpHours": 2
  },
  "Turbo Composter": {
    "worm": "Grub",
    "produce": "Fruitful Blend",
    "produceAmount": 3,
    "hours": 8,
    "speedUpAmount": 20,
    "speedUpHours": 3
  },
  "Premium Composter": {
    "worm": "Red Wiggler",
    "produce": "Rapid Root",
    "produceAmount": 10,
    "hours": 12,
    "speedUpAmount": 30,
    "speedUpHours": 4
  }
};

/** Что нужно для запуска: компостер → сезон года → предмет → количество. */
export const COMPOST_RECIPES: Record<string, Record<string, Record<string, number>>> = {
  "Compost Bin": {
    "spring": {
      "Rhubarb": 10,
      "Carrot": 5
    },
    "summer": {
      "Zucchini": 10,
      "Pepper": 2
    },
    "autumn": {
      "Yam": 15
    },
    "winter": {
      "Potato": 10,
      "Cabbage": 3
    }
  },
  "Turbo Composter": {
    "spring": {
      "Soybean": 5,
      "Corn": 3
    },
    "summer": {
      "Cauliflower": 4,
      "Eggplant": 3
    },
    "autumn": {
      "Broccoli": 10,
      "Artichoke": 2
    },
    "winter": {
      "Onion": 5,
      "Turnip": 2
    }
  },
  "Premium Composter": {
    "spring": {
      "Blueberry": 8,
      "Egg": 5
    },
    "summer": {
      "Banana": 3,
      "Egg": 5
    },
    "autumn": {
      "Apple": 4,
      "Tomato": 5
    },
    "winter": {
      "Lemon": 3,
      "Apple": 3
    }
  }
};

/** Сколько червей выпадает при сборе (случайный выбор из списка, до бустов). */
export const WORM_AMOUNTS: Record<string, number[]> = {
  "Earthworm": [
    2,
    3,
    3,
    3,
    4
  ],
  "Grub": [
    2,
    2,
    2,
    3,
    3
  ],
  "Red Wiggler": [
    1,
    1,
    2,
    2,
    2,
    3
  ]
};

export const COMPOSTER_BUILDINGS: Record<string, BuildingRecord> = {
  "Compost Bin": {
    "level": 7,
    "coins": 0,
    "hours": 1,
    "ingredients": {
      "Wood": 5,
      "Stone": 5
    }
  },
  "Turbo Composter": {
    "level": 12,
    "coins": 0,
    "hours": 2,
    "ingredients": {
      "Wood": 50,
      "Stone": 25
    }
  },
  "Premium Composter": {
    "level": 18,
    "coins": 0,
    "hours": 4,
    "ingredients": {
      "Gold": 50
    }
  }
};
