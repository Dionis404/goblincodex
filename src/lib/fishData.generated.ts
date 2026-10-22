// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-fish-data.ts из исходников Sunflower Land
// (src/features/game/types/fishing.ts). Не править руками — запустите
// `npm run sfl:sync-fish` после `npm run sfl:clone`.

export interface FishRecord {
  name: string;
  /** basic | advanced | expert */
  type: string;
  /** Подходящая наживка: червь (Earthworm/Grub/Red Wiggler) или Fishing Lure. */
  baits: string[];
  /** Приманка (chum), которая повышает шанс именно этой рыбы. */
  likes: string[];
  seasons: string[];
}

/** Обычная рыба. Марвелы (постоянные и глав) не включены — они в разделе «Морские марвелы». */
export const FISH_RECORDS: FishRecord[] = [
  {
    "name": "Anchovy",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Carrot",
      "Egg"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ]
  },
  {
    "name": "Butterflyfish",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Sunflower"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Blowfish",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Yam"
    ],
    "seasons": [
      "winter"
    ]
  },
  {
    "name": "Clownfish",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Cabbage"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Sea Bass",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Anchovy"
    ],
    "seasons": [
      "spring",
      "autumn"
    ]
  },
  {
    "name": "Sea Horse",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Seaweed"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "Horse Mackerel",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Blueberry"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Halibut",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Anchovy"
    ],
    "seasons": [
      "spring",
      "autumn"
    ]
  },
  {
    "name": "Squid",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Eggplant",
      "Onion"
    ],
    "seasons": [
      "spring",
      "winter"
    ]
  },
  {
    "name": "Porgy",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Yam"
    ],
    "seasons": [
      "spring"
    ]
  },
  {
    "name": "Muskellunge",
    "type": "basic",
    "baits": [
      "Earthworm"
    ],
    "likes": [
      "Turnip"
    ],
    "seasons": [
      "autumn"
    ]
  },
  {
    "name": "Red Snapper",
    "type": "advanced",
    "baits": [
      "Grub",
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Apple",
      "Honey"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ]
  },
  {
    "name": "Moray Eel",
    "type": "advanced",
    "baits": [
      "Earthworm",
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Gold"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Olive Flounder",
    "type": "advanced",
    "baits": [
      "Earthworm",
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Rhubarb"
    ],
    "seasons": [
      "spring",
      "autumn"
    ]
  },
  {
    "name": "Napoleanfish",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Carrot"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Surgeonfish",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Orange"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Angelfish",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Banana"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Zebra Turkeyfish",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Beetroot",
      "Rhubarb"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "Ray",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Squid"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "Hammerhead shark",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Iron"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Barred Knifejaw",
    "type": "advanced",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Anchovy"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "Walleye",
    "type": "advanced",
    "baits": [
      "Grub"
    ],
    "likes": [
      "Broccoli"
    ],
    "seasons": [
      "winter"
    ]
  },
  {
    "name": "Rock Blackfish",
    "type": "advanced",
    "baits": [
      "Grub"
    ],
    "likes": [
      "Onion"
    ],
    "seasons": [
      "autumn"
    ]
  },
  {
    "name": "Tilapia",
    "type": "advanced",
    "baits": [
      "Grub"
    ],
    "likes": [
      "Zucchini"
    ],
    "seasons": [
      "summer"
    ]
  },
  {
    "name": "Tuna",
    "type": "expert",
    "baits": [
      "Grub",
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Orange",
      "Wild Mushroom"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ]
  },
  {
    "name": "Mahi Mahi",
    "type": "expert",
    "baits": [
      "Grub",
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Corn"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Blue Marlin",
    "type": "expert",
    "baits": [
      "Grub",
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Wheat"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Oarfish",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Kale"
    ],
    "seasons": [
      "spring",
      "winter"
    ]
  },
  {
    "name": "Football fish",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Sunflower"
    ],
    "seasons": [
      "winter"
    ]
  },
  {
    "name": "Sunfish",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Anchovy"
    ],
    "seasons": [
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Coelacanth",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Cabbage"
    ],
    "seasons": [
      "spring",
      "winter"
    ]
  },
  {
    "name": "Parrotfish",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Seaweed"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "Whale Shark",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Crab",
      "Fat Chicken"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Saw Shark",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Red Snapper",
      "Speed Chicken"
    ],
    "seasons": [
      "spring",
      "summer"
    ]
  },
  {
    "name": "White Shark",
    "type": "expert",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Tuna",
      "Rich Chicken"
    ],
    "seasons": [
      "summer",
      "winter"
    ]
  },
  {
    "name": "Cobia",
    "type": "expert",
    "baits": [
      "Red Wiggler"
    ],
    "likes": [
      "Broccoli"
    ],
    "seasons": [
      "summer"
    ]
  },
  {
    "name": "Trout",
    "type": "expert",
    "baits": [
      "Red Wiggler"
    ],
    "likes": [
      "Pepper"
    ],
    "seasons": [
      "winter"
    ]
  },
  {
    "name": "Weakfish",
    "type": "expert",
    "baits": [
      "Red Wiggler"
    ],
    "likes": [
      "Artichoke"
    ],
    "seasons": [
      "spring"
    ]
  }
];

/** Рыба, которую гарантирует наживка (Fish Flake и т.д.). */
export const GUARANTEED_CATCH: Record<string, string[]> = {
  "Fish Flake": [
    "Anchovy",
    "Butterflyfish",
    "Halibut",
    "Blowfish",
    "Porgy",
    "Clownfish",
    "Sea Bass",
    "Sea Horse",
    "Muskellunge",
    "Horse Mackerel",
    "Squid",
    "Moray Eel",
    "Olive Flounder",
    "Tilapia",
    "Napoleanfish",
    "Surgeonfish",
    "Zebra Turkeyfish",
    "Walleye",
    "Angelfish",
    "Ray"
  ],
  "Fish Stick": [
    "Rock Blackfish",
    "Hammerhead shark",
    "Tuna",
    "Mahi Mahi",
    "Blue Marlin",
    "Weakfish",
    "Oarfish",
    "Football fish",
    "Sunfish",
    "Cobia"
  ],
  "Fish Oil": [
    "Barred Knifejaw",
    "Trout",
    "Coelacanth",
    "Saw Shark"
  ],
  "Crab Stick": [
    "Barred Knifejaw",
    "Whale Shark",
    "White Shark",
    "Parrotfish"
  ]
};

/** Сколько единиц предмета уходит как приманка за один заброс. */
export const CHUM_AMOUNTS: Record<string, number> = {
  "Gold": 1,
  "Wild Mushroom": 1,
  "Honey": 1,
  "Iron": 5,
  "Stone": 5,
  "Egg": 5,
  "Sunflower": 50,
  "Potato": 20,
  "Yam": 20,
  "Rhubarb": 20,
  "Pumpkin": 20,
  "Carrot": 10,
  "Cabbage": 10,
  "Broccoli": 10,
  "Pepper": 10,
  "Beetroot": 10,
  "Onion": 5,
  "Cauliflower": 5,
  "Parsnip": 5,
  "Eggplant": 5,
  "Corn": 5,
  "Radish": 5,
  "Turnip": 5,
  "Wheat": 5,
  "Kale": 5,
  "Barley": 3,
  "Artichoke": 3,
  "Blueberry": 3,
  "Orange": 3,
  "Apple": 3,
  "Banana": 3,
  "Seaweed": 1,
  "Crab": 2,
  "Anchovy": 1,
  "Red Snapper": 1,
  "Tuna": 1,
  "Squid": 1,
  "Wood": 5,
  "Red Pansy": 1,
  "Fat Chicken": 3,
  "Rich Chicken": 3,
  "Speed Chicken": 3,
  "Horse Mackerel": 1,
  "Sunfish": 1,
  "Zebra Turkeyfish": 1,
  "Zucchini": 20,
  "Weed": 3,
  "Acorn": 3
};

/** Ловушки для ракообразных (crustaceans.ts): время, уровень бампкина и расход приманки. */
export const WATER_TRAPS: Record<string, { readyHours: number; level: number; chums: Record<string, number> }> = {
  "Crab Pot": {
    "readyHours": 4,
    "level": 18,
    "chums": {
      "Heart leaf": 3,
      "Ribbon": 3,
      "Wild Grass": 3,
      "Frost Pebble": 3,
      "Grape": 5,
      "Rice": 5,
      "Crimstone": 2,
      "Moonfur": 1,
      "Fish Stick": 2,
      "Fish Oil": 2,
      "Crab Stick": 2
    }
  },
  "Mariner Pot": {
    "readyHours": 8,
    "level": 24,
    "chums": {
      "Crimstone": 2,
      "Chewed Bone": 3,
      "Ruffroot": 3,
      "Dewberry": 3,
      "Duskberry": 3,
      "Lunara": 3,
      "Moonfur": 1,
      "Fish Stick": 2,
      "Crab Stick": 2
    }
  }
};

interface BaitRecipe {
  /** Время изготовления, секунды. */
  seconds: number;
  /** Ингредиенты, которые нужны всегда. */
  base: Record<string, number>;
  /** Добавка по сезонам года (spring | summer | autumn | winter). */
  seasonal: Record<string, Record<string, number>>;
}

/** Рецепты наживок: итоговый набор = base + seasonal[сезон]. Сезон года в игре меняется. */
export const BAIT_RECIPES: Record<string, BaitRecipe> = {
  "Fish Flake": {
    "seconds": 3600,
    "base": {
      "Anchovy": 4
    },
    "seasonal": {
      "spring": {
        "Porgy": 2,
        "Sea Bass": 2
      },
      "summer": {
        "Butterflyfish": 2,
        "Sea Horse": 2
      },
      "autumn": {
        "Halibut": 2,
        "Muskellunge": 2
      },
      "winter": {
        "Blowfish": 2,
        "Clownfish": 2
      }
    }
  },
  "Fish Stick": {
    "seconds": 7200,
    "base": {
      "Red Snapper": 6
    },
    "seasonal": {
      "spring": {
        "Olive Flounder": 2,
        "Zebra Turkeyfish": 2
      },
      "summer": {
        "Surgeonfish": 2,
        "Tilapia": 2
      },
      "autumn": {
        "Moray Eel": 2,
        "Napoleanfish": 2
      },
      "winter": {
        "Walleye": 2,
        "Angelfish": 2
      }
    }
  },
  "Fish Oil": {
    "seconds": 57600,
    "base": {
      "Tuna": 8
    },
    "seasonal": {
      "spring": {
        "Weakfish": 2,
        "Oarfish": 2
      },
      "summer": {
        "Cobia": 2,
        "Sunfish": 2
      },
      "autumn": {
        "Mahi Mahi": 4,
        "Crab": 2
      },
      "winter": {
        "Blue Marlin": 2,
        "Football fish": 2
      }
    }
  },
  "Crab Stick": {
    "seconds": 14400,
    "base": {
      "Crab": 1
    },
    "seasonal": {
      "spring": {
        "Blue Crab": 1,
        "Hermit Crab": 1,
        "Sea Slug": 1
      },
      "summer": {
        "Mussel": 1,
        "Isopod": 1,
        "Sea Snail": 1
      },
      "autumn": {
        "Shrimp": 1,
        "Lobster": 1,
        "Barnacle": 1
      },
      "winter": {
        "Oyster": 1,
        "Isopod": 1,
        "Garden Eel": 1
      }
    }
  }
};

/** Цена продажи Crab в монетах (находка с раскопок / мусор при рыбалке; на рынке не торгуется). */
export const CRAB_SELL_COINS = 15;

/** Ловушка → приманка (или "none") → кто попадётся. Результат детерминирован, без случайности. */
export const CRUSTACEAN_LOOKUP: Record<string, Record<string, string>> = {
  "Crab Pot": {
    "none": "Isopod",
    "Heart leaf": "Blue Crab",
    "Ribbon": "Blue Crab",
    "Wild Grass": "Lobster",
    "Frost Pebble": "Lobster",
    "Grape": "Hermit Crab",
    "Rice": "Hermit Crab",
    "Crimstone": "Shrimp",
    "Moonfur": "Mussel",
    "Fish Stick": "Oyster",
    "Fish Oil": "Anemone",
    "Crab Stick": "Anemone"
  },
  "Mariner Pot": {
    "none": "Barnacle",
    "Crimstone": "Sea Slug",
    "Chewed Bone": "Sea Snail",
    "Ruffroot": "Sea Snail",
    "Dewberry": "Garden Eel",
    "Duskberry": "Garden Eel",
    "Lunara": "Sea Grapes",
    "Moonfur": "Octopus",
    "Fish Stick": "Sea Urchin",
    "Crab Stick": "Horseshoe Crab"
  }
};
