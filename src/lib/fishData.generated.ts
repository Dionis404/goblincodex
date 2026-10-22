// ЭТОТ ФАЙЛ СГЕНЕРИРОВАН scripts/sync-fish-data.ts из исходников Sunflower Land
// (src/features/game/types/fishing.ts). Не править руками — запустите
// `npm run sfl:sync-fish` после `npm run sfl:clone`.

export interface FishRecord {
  name: string;
  /** basic | advanced | expert | marine marvel */
  type: string;
  /** Подходящая наживка: червь (Earthworm/Grub/Red Wiggler) или Fishing Lure. */
  baits: string[];
  /** Приманка (chum), которая повышает шанс именно этой рыбы. */
  likes: string[];
  seasons: string[];
}

/** Обычная рыба и постоянные марвелы. Марвелы глав (CHAPTER_FISH) не включены — они в разделе «Морские марвелы». */
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
  },
  {
    "name": "Twilight Anglerfish",
    "type": "marine marvel",
    "baits": [
      "Red Wiggler",
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Sunfish"
    ],
    "seasons": [
      "winter",
      "spring",
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Starlight Tuna",
    "type": "marine marvel",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Horse Mackerel",
      "Zebra Turkeyfish"
    ],
    "seasons": [
      "winter",
      "spring",
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Radiant Ray",
    "type": "marine marvel",
    "baits": [
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Iron"
    ],
    "seasons": [
      "winter",
      "spring",
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Phantom Barracuda",
    "type": "marine marvel",
    "baits": [
      "Grub",
      "Fishing Lure"
    ],
    "likes": [
      "Squid"
    ],
    "seasons": [
      "winter",
      "spring",
      "summer",
      "autumn"
    ]
  },
  {
    "name": "Gilded Swordfish",
    "type": "marine marvel",
    "baits": [
      "Earthworm",
      "Red Wiggler",
      "Fishing Lure"
    ],
    "likes": [
      "Gold"
    ],
    "seasons": [
      "winter",
      "spring",
      "summer",
      "autumn"
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
