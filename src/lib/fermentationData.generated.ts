// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-fermentation-data.ts из исходников Sunflower Land
// (types/fermentation.ts, types/spiceRack.ts, types/agingFormulas.ts).
// Не править руками — запустите `npm run sfl:sync-fermentation` после `npm run sfl:clone`.

export interface TimedRecipe {
  name: string;
  /** Секунды готовки без бустов (0 — мгновенно). */
  seconds: number;
  ingredients: Record<string, number>;
  outputs: Record<string, number>;
}

/** Стойка ферментации: маринады, теплица, смеси, соль из отходов. */
export const FERMENTATION_RECIPES: TimedRecipe[] = [
  {
    "name": "Pickled Radish",
    "seconds": 3600,
    "ingredients": {
      "Radish": 10,
      "Salt": 5
    },
    "outputs": {
      "Pickled Radish": 1
    }
  },
  {
    "name": "Pickled Zucchini",
    "seconds": 3600,
    "ingredients": {
      "Zucchini": 75,
      "Salt": 5
    },
    "outputs": {
      "Pickled Zucchini": 1
    }
  },
  {
    "name": "Pickled Tomato",
    "seconds": 3600,
    "ingredients": {
      "Tomato": 15,
      "Salt": 5
    },
    "outputs": {
      "Pickled Tomato": 1
    }
  },
  {
    "name": "Pickled Broccoli",
    "seconds": 3600,
    "ingredients": {
      "Broccoli": 20,
      "Salt": 5
    },
    "outputs": {
      "Pickled Broccoli": 1
    }
  },
  {
    "name": "Pickled Onion",
    "seconds": 3600,
    "ingredients": {
      "Onion": 10,
      "Salt": 5
    },
    "outputs": {
      "Pickled Onion": 1
    }
  },
  {
    "name": "Pickled Pepper",
    "seconds": 3600,
    "ingredients": {
      "Pepper": 30,
      "Salt": 5
    },
    "outputs": {
      "Pickled Pepper": 1
    }
  },
  {
    "name": "Greenhouse Glow: Pickled Tomato",
    "seconds": 7200,
    "ingredients": {
      "Pickled Tomato": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Glow": 1
    }
  },
  {
    "name": "Greenhouse Glow: Pickled Zucchini",
    "seconds": 7200,
    "ingredients": {
      "Pickled Zucchini": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Glow": 1
    }
  },
  {
    "name": "Greenhouse Glow: Pickled Broccoli",
    "seconds": 7200,
    "ingredients": {
      "Pickled Broccoli": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Glow": 1
    }
  },
  {
    "name": "Greenhouse Goodie: Pickled Radish",
    "seconds": 7200,
    "ingredients": {
      "Pickled Radish": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Goodie": 1
    }
  },
  {
    "name": "Greenhouse Goodie: Pickled Pepper",
    "seconds": 7200,
    "ingredients": {
      "Pickled Pepper": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Goodie": 1
    }
  },
  {
    "name": "Greenhouse Goodie: Pickled Onion",
    "seconds": 7200,
    "ingredients": {
      "Pickled Onion": 1,
      "Refined Salt": 1
    },
    "outputs": {
      "Greenhouse Goodie": 1
    }
  },
  {
    "name": "Sproutroot Surprise",
    "seconds": 120,
    "ingredients": {
      "Sprout Mix": 5,
      "Rapid Root": 5,
      "Refined Salt": 2
    },
    "outputs": {
      "Sproutroot Surprise": 5
    }
  },
  {
    "name": "Turbofruit Mix",
    "seconds": 120,
    "ingredients": {
      "Rapid Root": 5,
      "Fruitful Blend": 5,
      "Refined Salt": 2
    },
    "outputs": {
      "Turbofruit Mix": 5
    }
  },
  {
    "name": "Salt from Seaweed",
    "seconds": 0,
    "ingredients": {
      "Seaweed": 4
    },
    "outputs": {
      "Salt": 15
    }
  },
  {
    "name": "Salt from Old Bottle",
    "seconds": 0,
    "ingredients": {
      "Old Bottle": 8
    },
    "outputs": {
      "Salt": 9
    }
  },
  {
    "name": "Salt from Crab",
    "seconds": 0,
    "ingredients": {
      "Crab": 4
    },
    "outputs": {
      "Salt": 3
    }
  },
  {
    "name": "Salt from Bones",
    "seconds": 0,
    "ingredients": {
      "Camel Bone": 2
    },
    "outputs": {
      "Salt": 1
    }
  }
];

/** Стойка специй. */
export const SPICE_RACK_RECIPES: TimedRecipe[] = [
  {
    "name": "Refined Salt",
    "seconds": 3600,
    "ingredients": {
      "Salt": 10
    },
    "outputs": {
      "Refined Salt": 1
    }
  },
  {
    "name": "Salt Lick",
    "seconds": 3600,
    "ingredients": {
      "Refined Salt": 5
    },
    "outputs": {
      "Salt Lick": 5
    }
  },
  {
    "name": "Honey Treat",
    "seconds": 3600,
    "ingredients": {
      "Refined Salt": 5,
      "Honey": 5
    },
    "outputs": {
      "Honey Treat": 5
    }
  },
  {
    "name": "Truffle Seasoning",
    "seconds": 3600,
    "ingredients": {
      "Truffle": 10,
      "Refined Salt": 5,
      "Wild Mushroom": 5
    },
    "outputs": {
      "Truffle Seasoning": 5
    }
  }
];

export interface BaitFamily {
  bait: string;
  /** Ранг рыбы, из которой делается наживка (basic | advanced | expert). */
  fishTier: string;
  /** Подходящие маринады. */
  pickles: string[];
}

/** Наживки из выдержанной рыбы: 1 Aged/Prime Aged рыба + 1 маринад. */
export const BAIT_FAMILIES: BaitFamily[] = [
  {
    "bait": "Capsule Bait",
    "pickles": [
      "Pickled Zucchini",
      "Pickled Tomato"
    ],
    "fishTier": "basic"
  },
  {
    "bait": "Umbrella Bait",
    "pickles": [
      "Pickled Broccoli",
      "Pickled Pepper"
    ],
    "fishTier": "advanced"
  },
  {
    "bait": "Crimson Baitfish",
    "pickles": [
      "Pickled Radish",
      "Pickled Onion"
    ],
    "fishTier": "expert"
  }
];
export const BAIT_OUTPUT_AGED = 5;
export const BAIT_OUTPUT_PRIME = 10;
export const BAIT_SECONDS = 300;

/** Слотов на стойках: по одному на уровень Aging Shed, но не больше. */
export const RACK_MAX_SLOTS = { fermentation: 6, spice: 6 };

/** Шанс (в процентах), что Astrolabe удвоит выход стойки ферментации или специй. */
export const ASTROLABE_DOUBLE_CHANCE = 15;
