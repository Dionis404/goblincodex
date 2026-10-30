// Сгенерировано scripts/sync-animal-data.ts из исходников sunflower-land — не править вручную.
// Обновление: npm run sfl:sync-animals
/* eslint-disable */

export const ANIMAL_TYPES = [
  "Chicken",
  "Cow",
  "Sheep",
  "Pig"
] as const;

export const ANIMAL_COINS = {
  "Chicken": 50,
  "Cow": 100,
  "Sheep": 120,
  "Pig": 100
} as const;

export const ANIMAL_BUILDING = {
  "Chicken": "Hen House",
  "Cow": "Barn",
  "Sheep": "Barn",
  "Pig": "Pigpen"
} as const;

export const ANIMAL_LEVELS = {
  "Chicken": {
    "0": 0,
    "1": 60,
    "2": 120,
    "3": 240,
    "4": 360,
    "5": 480,
    "6": 660,
    "7": 840,
    "8": 1020,
    "9": 1200,
    "10": 1440,
    "11": 1680,
    "12": 1920,
    "13": 2160,
    "14": 2400,
    "15": 2720
  },
  "Cow": {
    "0": 0,
    "1": 180,
    "2": 360,
    "3": 720,
    "4": 1080,
    "5": 1440,
    "6": 1980,
    "7": 2520,
    "8": 3060,
    "9": 3600,
    "10": 4320,
    "11": 5040,
    "12": 5760,
    "13": 6480,
    "14": 7200,
    "15": 8160
  },
  "Sheep": {
    "0": 0,
    "1": 120,
    "2": 240,
    "3": 480,
    "4": 720,
    "5": 960,
    "6": 1320,
    "7": 1680,
    "8": 2040,
    "9": 2400,
    "10": 2880,
    "11": 3360,
    "12": 3840,
    "13": 4320,
    "14": 4800,
    "15": 5440
  },
  "Pig": {
    "0": 0,
    "1": 180,
    "2": 360,
    "3": 720,
    "4": 1080,
    "5": 1440,
    "6": 1980,
    "7": 2520,
    "8": 3060,
    "9": 3600,
    "10": 4320,
    "11": 5040,
    "12": 5760,
    "13": 6480,
    "14": 7200,
    "15": 8160
  }
} as const;

export const ANIMAL_FOOD_XP = {
  "Chicken": {
    "0": {
      "Hay": 10,
      "Kernel Blend": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "1": {
      "Hay": 10,
      "Kernel Blend": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "2": {
      "Hay": 10,
      "Kernel Blend": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "3": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "4": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "5": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "6": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "7": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "8": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "9": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "10": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "11": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "12": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "13": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "14": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "15": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    }
  },
  "Cow": {
    "0": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "1": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "2": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "3": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "4": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "5": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "6": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "7": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "8": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "9": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "10": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "11": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "12": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "13": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "14": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "15": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    }
  },
  "Sheep": {
    "0": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "1": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "2": {
      "Kernel Blend": 60,
      "Hay": 10,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "3": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "4": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "5": {
      "Kernel Blend": 10,
      "Hay": 60,
      "NutriBarley": 20,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "6": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "7": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "8": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "9": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 60,
      "Mixed Grain": 30,
      "Omnifeed": 60
    },
    "10": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "11": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "12": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "13": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "14": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    },
    "15": {
      "Kernel Blend": 10,
      "Hay": 20,
      "NutriBarley": 30,
      "Mixed Grain": 80,
      "Omnifeed": 80
    }
  },
  "Pig": {
    "0": {
      "Basic Slop": 60,
      "Hearty Slop": 10,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "1": {
      "Basic Slop": 60,
      "Hearty Slop": 10,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "2": {
      "Basic Slop": 60,
      "Hearty Slop": 10,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "3": {
      "Basic Slop": 10,
      "Hearty Slop": 60,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "4": {
      "Basic Slop": 10,
      "Hearty Slop": 60,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "5": {
      "Basic Slop": 10,
      "Hearty Slop": 60,
      "Rich Slop": 20,
      "Gourmet Slop": 30
    },
    "6": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 60,
      "Gourmet Slop": 30
    },
    "7": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 60,
      "Gourmet Slop": 30
    },
    "8": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 60,
      "Gourmet Slop": 30
    },
    "9": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 60,
      "Gourmet Slop": 30
    },
    "10": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    },
    "11": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    },
    "12": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    },
    "13": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    },
    "14": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    },
    "15": {
      "Basic Slop": 10,
      "Hearty Slop": 20,
      "Rich Slop": 30,
      "Gourmet Slop": 80
    }
  }
} as const;

export const ANIMAL_DROPS = {
  "Chicken": {
    "0": {},
    "1": {
      "Egg": 1
    },
    "2": {
      "Egg": 1
    },
    "3": {
      "Egg": 1,
      "Feather": 1
    },
    "4": {
      "Egg": 2,
      "Feather": 1
    },
    "5": {
      "Egg": 2,
      "Feather": 1
    },
    "6": {
      "Egg": 2,
      "Feather": 1
    },
    "7": {
      "Egg": 2,
      "Feather": 1
    },
    "8": {
      "Egg": 3,
      "Feather": 1
    },
    "9": {
      "Egg": 3,
      "Feather": 2
    },
    "10": {
      "Egg": 3,
      "Feather": 2
    },
    "11": {
      "Egg": 3,
      "Feather": 2
    },
    "12": {
      "Egg": 3,
      "Feather": 2
    },
    "13": {
      "Egg": 4,
      "Feather": 2
    },
    "14": {
      "Egg": 4,
      "Feather": 2
    },
    "15": {
      "Egg": 5,
      "Feather": 3
    }
  },
  "Cow": {
    "0": {},
    "1": {
      "Milk": 1,
      "Leather": 1
    },
    "2": {
      "Milk": 1,
      "Leather": 1
    },
    "3": {
      "Milk": 1,
      "Leather": 1
    },
    "4": {
      "Milk": 2,
      "Leather": 1
    },
    "5": {
      "Milk": 2,
      "Leather": 1
    },
    "6": {
      "Milk": 2,
      "Leather": 2
    },
    "7": {
      "Milk": 2,
      "Leather": 2
    },
    "8": {
      "Milk": 3,
      "Leather": 2
    },
    "9": {
      "Milk": 3,
      "Leather": 2
    },
    "10": {
      "Milk": 3,
      "Leather": 3
    },
    "11": {
      "Milk": 3,
      "Leather": 3
    },
    "12": {
      "Milk": 3,
      "Leather": 3
    },
    "13": {
      "Milk": 3,
      "Leather": 3
    },
    "14": {
      "Milk": 3,
      "Leather": 3
    },
    "15": {
      "Milk": 4,
      "Leather": 4
    }
  },
  "Sheep": {
    "0": {},
    "1": {
      "Wool": 1,
      "Merino Wool": 1
    },
    "2": {
      "Wool": 1,
      "Merino Wool": 1
    },
    "3": {
      "Wool": 1,
      "Merino Wool": 1
    },
    "4": {
      "Wool": 2,
      "Merino Wool": 1
    },
    "5": {
      "Wool": 2,
      "Merino Wool": 1
    },
    "6": {
      "Wool": 2,
      "Merino Wool": 2
    },
    "7": {
      "Wool": 2,
      "Merino Wool": 2
    },
    "8": {
      "Wool": 3,
      "Merino Wool": 2
    },
    "9": {
      "Wool": 3,
      "Merino Wool": 2
    },
    "10": {
      "Wool": 3,
      "Merino Wool": 3
    },
    "11": {
      "Wool": 3,
      "Merino Wool": 3
    },
    "12": {
      "Wool": 3,
      "Merino Wool": 3
    },
    "13": {
      "Wool": 3,
      "Merino Wool": 3
    },
    "14": {
      "Wool": 3,
      "Merino Wool": 3
    },
    "15": {
      "Wool": 4,
      "Merino Wool": 4
    }
  },
  "Pig": {
    "0": {},
    "1": {
      "Truffle": 1
    },
    "2": {
      "Truffle": 1
    },
    "3": {
      "Truffle": 1
    },
    "4": {
      "Truffle": 2
    },
    "5": {
      "Truffle": 2
    },
    "6": {
      "Truffle": 2
    },
    "7": {
      "Truffle": 2
    },
    "8": {
      "Truffle": 3
    },
    "9": {
      "Truffle": 3
    },
    "10": {
      "Truffle": 3
    },
    "11": {
      "Truffle": 3
    },
    "12": {
      "Truffle": 3
    },
    "13": {
      "Truffle": 3
    },
    "14": {
      "Truffle": 3
    },
    "15": {
      "Truffle": 4
    }
  }
} as const;

export const PIG_BRISTLES_PER_LEVEL = {
  "0": 0,
  "1": 0,
  "2": 0,
  "3": 1,
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 3,
  "8": 4,
  "9": 5,
  "10": 6,
  "11": 6,
  "12": 7,
  "13": 8,
  "14": 9,
  "15": 12
} as const;

export const ANIMAL_FOOD_RECIPES = {
  "Kernel Blend": {
    "type": "food",
    "ingredients": {
      "Corn": 1
    }
  },
  "Hay": {
    "type": "food",
    "ingredients": {
      "Wheat": 1
    }
  },
  "NutriBarley": {
    "type": "food",
    "ingredients": {
      "Barley": 1
    }
  },
  "Mixed Grain": {
    "type": "food",
    "ingredients": {
      "Wheat": 1,
      "Corn": 1,
      "Barley": 1
    }
  },
  "Barn Delight": {
    "type": "medicine",
    "ingredients": {
      "Lemon": 5,
      "Honey": 3
    }
  },
  "Omnifeed": {
    "type": "food",
    "ingredients": {
      "Gem": 1
    }
  },
  "Basic Slop": {
    "type": "food",
    "ingredients": {}
  },
  "Hearty Slop": {
    "type": "food",
    "ingredients": {}
  },
  "Rich Slop": {
    "type": "food",
    "ingredients": {}
  },
  "Gourmet Slop": {
    "type": "food",
    "ingredients": {}
  }
} as const;

export const PIG_FEEDS = {
  "Basic Slop": {
    "tier": 1,
    "ingredients": {
      "Sunflower": 800,
      "Potato": 150,
      "Rhubarb": 100,
      "Pumpkin": 60,
      "Zucchini": 60,
      "Carrot": 25,
      "Yam": 25,
      "Cabbage": 15,
      "Broccoli": 15,
      "Soybean": 9
    }
  },
  "Hearty Slop": {
    "tier": 2,
    "ingredients": {
      "Beetroot": 15,
      "Pepper": 15,
      "Cauliflower": 8,
      "Parsnip": 5,
      "Tomato": 20,
      "Lemon": 4,
      "Blueberry": 4
    }
  },
  "Rich Slop": {
    "tier": 3,
    "ingredients": {
      "Eggplant": 6,
      "Wheat": 6,
      "Turnip": 6,
      "Corn": 5,
      "Onion": 5,
      "Radish": 5,
      "Kale": 4,
      "Artichoke": 4,
      "Barley": 3,
      "Orange": 3,
      "Apple": 2,
      "Banana": 2,
      "Anchovy": 1,
      "Butterflyfish": 1,
      "Blowfish": 1,
      "Clownfish": 1,
      "Sea Bass": 1,
      "Sea Horse": 1,
      "Horse Mackerel": 1,
      "Halibut": 1,
      "Squid": 1,
      "Porgy": 1,
      "Muskellunge": 1,
      "Wild Mushroom": 1,
      "Isopod": 1,
      "Barnacle": 1
    }
  },
  "Gourmet Slop": {
    "tier": 4,
    "ingredients": {
      "Rice": 1,
      "Olive": 1,
      "Grape": 1,
      "Celestine": 1,
      "Lunara": 1,
      "Duskberry": 1,
      "Red Snapper": 1,
      "Moray Eel": 1,
      "Olive Flounder": 1,
      "Napoleanfish": 1,
      "Surgeonfish": 1,
      "Angelfish": 1,
      "Zebra Turkeyfish": 1,
      "Ray": 1,
      "Hammerhead shark": 1,
      "Barred Knifejaw": 1,
      "Walleye": 1,
      "Rock Blackfish": 1,
      "Tilapia": 1,
      "Tuna": 1,
      "Mahi Mahi": 1,
      "Blue Marlin": 1,
      "Oarfish": 1,
      "Football fish": 1,
      "Sunfish": 1,
      "Coelacanth": 1,
      "Parrotfish": 1,
      "Whale Shark": 1,
      "Saw Shark": 1,
      "White Shark": 1,
      "Cobia": 1,
      "Trout": 1,
      "Weakfish": 1,
      "Magic Mushroom": 1,
      "Blue Crab": 1,
      "Lobster": 1,
      "Hermit Crab": 1,
      "Shrimp": 1,
      "Mussel": 1,
      "Oyster": 1,
      "Anemone": 1,
      "Sea Slug": 1,
      "Sea Snail": 1,
      "Garden Eel": 1,
      "Sea Grapes": 1,
      "Octopus": 1,
      "Sea Urchin": 1,
      "Horseshoe Crab": 1
    }
  }
} as const;

export const REQUIRED_FOOD_QTY = {
  "Chicken": 1,
  "Sheep": 3,
  "Cow": 5,
  "Pig": 1
} as const;

export const ANIMAL_SLEEP_HOURS = 24 as const;

export const LOVE_ITEM_XP = {
  "Petting Hand": 25,
  "Brush": 40,
  "Music Box": 50
} as const;

export const LOVE_ITEM_CHANCES = {
  "0": {
    "Petting Hand": 0,
    "Brush": 0,
    "Music Box": 0
  },
  "1": {
    "Petting Hand": 10,
    "Brush": 0,
    "Music Box": 0
  },
  "2": {
    "Petting Hand": 8,
    "Brush": 2,
    "Music Box": 0
  },
  "3": {
    "Petting Hand": 7,
    "Brush": 3,
    "Music Box": 0
  },
  "4": {
    "Petting Hand": 6,
    "Brush": 3,
    "Music Box": 1
  },
  "5": {
    "Petting Hand": 5,
    "Brush": 4,
    "Music Box": 1
  },
  "6": {
    "Petting Hand": 5,
    "Brush": 3,
    "Music Box": 2
  },
  "7": {
    "Petting Hand": 4,
    "Brush": 4,
    "Music Box": 2
  },
  "8": {
    "Petting Hand": 4,
    "Brush": 3,
    "Music Box": 3
  },
  "9": {
    "Petting Hand": 3,
    "Brush": 4,
    "Music Box": 3
  },
  "10": {
    "Petting Hand": 3,
    "Brush": 3,
    "Music Box": 4
  },
  "11": {
    "Petting Hand": 2,
    "Brush": 4,
    "Music Box": 4
  },
  "12": {
    "Petting Hand": 2,
    "Brush": 3,
    "Music Box": 5
  },
  "13": {
    "Petting Hand": 1,
    "Brush": 4,
    "Music Box": 5
  },
  "14": {
    "Petting Hand": 1,
    "Brush": 3,
    "Music Box": 6
  },
  "15": {
    "Petting Hand": 1,
    "Brush": 2,
    "Music Box": 7
  }
} as const;

export const BEETLE_FEEDING_XP = {
  "Green Beetle": 100,
  "Blue Beetle": 200,
  "Pink Beetle": 400,
  "Amber Beetle": 800
} as const;

export const MUD_PER_APPLICATION = 25 as const;

export const MUD_XP_MULTIPLIER = 1.25 as const;

export const FEED_BUFF_HARVESTS = 3 as const;

export const MUD_HARVESTS = 1 as const;

export const ANIMAL_SKILL_EFFECTS = {
  "Efficient Feeding": {
    "kind": "costMultiplier",
    "ranks": [
      0.95,
      0.94,
      0.925
    ]
  },
  "Chonky Feed": {
    "kind": "xpWithFeedDebuff",
    "xp": [
      2,
      2.5,
      3
    ],
    "feed": [
      1.5,
      1.75,
      2
    ]
  },
  "Clucky Grazing": {
    "kind": "costWithDebuff",
    "buff": [
      0.75,
      0.65,
      0.5
    ],
    "debuff": [
      1.5,
      1.55,
      1.65
    ]
  },
  "Sheepwise Diet": {
    "kind": "costWithDebuff",
    "buff": [
      0.75,
      0.65,
      0.5
    ],
    "debuff": [
      1.5,
      1.55,
      1.65
    ]
  },
  "Cow-Smart Nutrition": {
    "kind": "costWithDebuff",
    "buff": [
      0.75,
      0.65,
      0.5
    ],
    "debuff": [
      1.5,
      1.55,
      1.65
    ]
  },
  "Swill Savvy": {
    "kind": "costWithDebuff",
    "buff": [
      0.75,
      0.65,
      0.5
    ],
    "debuff": [
      1.5,
      1.55,
      1.65
    ]
  },
  "Restless Animals": {
    "kind": "growthMultiplier",
    "ranks": [
      0.9,
      0.85,
      0.8
    ]
  },
  "Abundant Harvest": {
    "kind": "additiveYield",
    "ranks": [
      0.2,
      0.35,
      0.5
    ]
  },
  "Fine Fibers": {
    "kind": "additiveYield",
    "ranks": [
      0.1,
      0.15,
      0.2
    ]
  },
  "Featherweight": {
    "kind": "yieldWithDebuff",
    "buff": [
      0.35,
      0.45,
      0.55
    ],
    "debuff": [
      0.1,
      0.15,
      0.2
    ]
  },
  "Merino Whisperer": {
    "kind": "yieldWithDebuff",
    "buff": [
      0.35,
      0.6,
      0.9
    ],
    "debuff": [
      0.1,
      0.15,
      0.2
    ]
  },
  "Leathercraft Mastery": {
    "kind": "yieldWithDebuff",
    "buff": [
      0.35,
      0.6,
      0.8
    ],
    "debuff": [
      0.1,
      0.15,
      0.2
    ]
  },
  "Double Bale": {
    "kind": "multiplier",
    "ranks": [
      2,
      2.5,
      3
    ]
  },
  "Heartwarming Instruments": {
    "kind": "xpBonus",
    "ranks": [
      0.5,
      0.6,
      0.7
    ]
  },
  "Truffle Yield": {
    "kind": "yieldBonus",
    "ranks": [
      0.1,
      0.2,
      0.3
    ]
  },
  "Bristle Payout": {
    "kind": "yieldBonus",
    "ranks": [
      0.1,
      0.2,
      0.3
    ]
  }
} as const;

export const ANIMAL_ICONS = {
  "Abundant Harvest": "/sprites/icons/skill_icons/abundant_harvest.png",
  "Alien Chicken": "/sprites/sfts/alien_chicken.webp",
  "Amber Beetle": "/sprites/resources/beetles/amber_beetle.webp",
  "Anchovy": "/sprites/fish/anchovy.png",
  "Anemone": "/sprites/crustaceans/anemone.webp",
  "Angelfish": "/sprites/fish/angel_fish.png",
  "Apple": "/sprites/resources/apple.png",
  "Artichoke": "/sprites/crops/artichoke/crop.png",
  "Ascended Chicken": "/sprites/sfts/ascended_chicken.webp",
  "Ascended Cow": "/sprites/sfts/ascended_cow.webp",
  "Ascended Sheep": "/sprites/sfts/ascended_sheep.webp",
  "Astronaut Sheep": "/sprites/sfts/sheep_astronaut.webp",
  "Ayam Cemani": "/sprites/animals/chickens/ayam_cemani.webp",
  "Baby Cow": "/sprites/sfts/baby_cow.webp",
  "Bale": "/sprites/sfts/aoe/bale.png",
  "Banana": "/sprites/resources/banana.png",
  "Bantam Shrine": "/sprites/sfts/shrines/bantam_shrine.webp",
  "Barley": "/sprites/crops/barley/crop.png",
  "Barn Delight": "/sprites/animals/foods/barn_delight.webp",
  "Barn Manager": "/sprites/skills/barn_manager.png",
  "Barnacle": "/sprites/crustaceans/barnacle.webp",
  "Barred Knifejaw": "/sprites/fish/barred_knifejaw.png",
  "Basic Slop": "/sprites/animals/food/basic_slop.webp",
  "Beetle Sheep": "/sprites/sfts/beetle_sheep.webp",
  "Beetroot": "/sprites/crops/beetroot/crop.png",
  "Black Sheep Onesie": "/sprites/wearables/402.webp",
  "Blowfish": "/sprites/fish/blowfish.png",
  "Blue Beetle": "/sprites/resources/beetles/blue_beetle.webp",
  "Blue Crab": "/sprites/crustaceans/blue_crab.webp",
  "Blue Marlin": "/sprites/fish/blue_marlin.png",
  "Blueberry": "/sprites/resources/blueberry.png",
  "Bristle Payout": "/sprites/resources/pig_bristles.webp",
  "Broccoli": "/sprites/crops/brocolli/crop.png",
  "Brush": "/sprites/animals/brush.webp",
  "Butterflyfish": "/sprites/fish/butterfly_fish.png",
  "Cabbage": "/sprites/crops/cabbage/crop.png",
  "Carrot": "/sprites/crops/carrot/crop.png",
  "Cattlegrim": "/sprites/wearables/164.webp",
  "Cauliflower": "/sprites/crops/cauliflower/crop.png",
  "Celestine": "/sprites/fruit/celestine/celestine.webp",
  "Chicken": "/sprites/resources/animals/chicken.png",
  "Chicken Coop": "/sprites/sfts/chicken_coop.png",
  "Chicken Suit": "/sprites/wearables/403.webp",
  "Chonky Feed": "/sprites/icons/skill_icons/chonky_feed.png",
  "Clownfish": "/sprites/fish/clownfish.png",
  "Cluckulator": "/sprites/sfts/cluckulator.webp",
  "Clucky Grazing": "/sprites/animals/chickens/ready.webp",
  "Cobia": "/sprites/fish/copia.png",
  "Coelacanth": "/sprites/fish/coelacanth.png",
  "Collie Shrine": "/sprites/sfts/shrines/collie_shrine.webp",
  "Corn": "/sprites/crops/corn/crop.png",
  "Cow": "/sprites/animals/cows/idle.webp",
  "Cow-Smart Nutrition": "/sprites/animals/cows/ready.webp",
  "Cowbell Necklace": "/sprites/wearables/407.webp",
  "Double Bale": "/sprites/icons/skill_icons/double_bale.png",
  "Dr Cow": "/sprites/sfts/dr_cow.webp",
  "Dream Scarf": "/sprites/wearables/406.webp",
  "Duskberry": "/sprites/fruit/duskberry/duskberry.webp",
  "Efficient Feeding": "/sprites/animals/foods/hay.webp",
  "Egg": "/sprites/resources/animals/egg.png",
  "Eggplant": "/sprites/crops/eggplant/crop.png",
  "El Pollo Veloz": "/sprites/animals/chickens/el_pollo_veloz.webp",
  "Farm Dog": "/sprites/sfts/farm_dog.webp",
  "Fat Chicken": "/sprites/animals/chickens/fat_chicken.webp",
  "Feather": "/sprites/resources/animals/feather.webp",
  "Featherweight": "/sprites/resources/animals/feather.webp",
  "Fine Fibers": "/sprites/icons/skill_icons/fine_fibers.png",
  "Flamingo Chicken": "/sprites/sfts/flamingo_chicken.webp",
  "Football fish": "/sprites/fish/football_fish.png",
  "Garden Eel": "/sprites/crustaceans/garden_eel.webp",
  "Gem": "/sprites/icons/gem.webp",
  "Gold Egg": "/sprites/sfts/gold_egg.png",
  "Golden Cow": "/sprites/sfts/golden_cow.webp",
  "Golden Sheep": "/sprites/sfts/golden_sheep.webp",
  "Gourmet Slop": "/sprites/animals/food/gourmet_slop.webp",
  "Grape": "/sprites/greenhouse/grape.webp",
  "Green Beetle": "/sprites/resources/beetles/green_beetle.webp",
  "Halibut": "/sprites/fish/halibut.png",
  "Hammerhead shark": "/sprites/fish/hammerhead_shark.png",
  "Hay": "/sprites/animals/foods/hay.webp",
  "Heartwarming Instruments": "/sprites/icons/skill_icons/heartwarming_instruments.png",
  "Hearty Slop": "/sprites/animals/food/hearty_slop.webp",
  "Hermit Crab": "/sprites/crustaceans/hermit_crab.webp",
  "Honey": "/sprites/resources/honey.png",
  "Honey Treat": "/sprites/food/honey_treat.webp",
  "Horse Mackerel": "/sprites/fish/horse_mackerel.png",
  "Horseshoe Crab": "/sprites/crustaceans/horseshoe_crab.webp",
  "Infernal Bullwhip": "/sprites/wearables/400.webp",
  "Isopod": "/sprites/crustaceans/isopod.webp",
  "Janitor Chicken": "/sprites/animals/chickens/janitor_chicken.webp",
  "Kale": "/sprites/crops/kale/crop.png",
  "Kernel Blend": "/sprites/animals/foods/kernel_blend_v2.webp",
  "Leather": "/sprites/resources/animals/leather.webp",
  "Leathercraft Mastery": "/sprites/resources/animals/leather.webp",
  "Lemon": "/sprites/resources/lemon.webp",
  "Lobster": "/sprites/crustaceans/lobster.webp",
  "Longhorn Cowfish": "/sprites/fish/cow_fish.webp",
  "Lunara": "/sprites/fruit/lunara/lunara.webp",
  "Magic Mushroom": "/sprites/resources/magic_mushroom.png",
  "Mahi Mahi": "/sprites/fish/mahi_mahi.png",
  "Mammoth": "/sprites/sfts/mammoth.webp",
  "Merino Jumper": "/sprites/wearables/405.webp",
  "Merino Whisperer": "/sprites/resources/animals/merino_wool.webp",
  "Merino Wool": "/sprites/resources/animals/merino_wool.webp",
  "Mermaid Sheep": "/sprites/sfts/mermaid_sheep.webp",
  "Milk": "/sprites/resources/animals/milk.webp",
  "Milk Apron": "/sprites/wearables/408.webp",
  "Mixed Grain": "/sprites/animals/foods/mixed_grain_v2.webp",
  "Moo-ver": "/sprites/sfts/moo_ver.webp",
  "Mootant": "/sprites/sfts/mootant.webp",
  "Moray Eel": "/sprites/fish/moray_eel.png",
  "Mud": "/sprites/resources/mud.webp",
  "Music Box": "/sprites/animals/music_box.webp",
  "Muskellunge": "/sprites/fish/muskellunge.png",
  "Mussel": "/sprites/crustaceans/mussel.webp",
  "Napoleanfish": "/sprites/fish/napoleonfish.png",
  "NutriBarley": "/sprites/animals/foods/nutri_barley_v2.webp",
  "Oarfish": "/sprites/fish/oarfish.png",
  "Octopus": "/sprites/crustaceans/octopus.webp",
  "Olive": "/sprites/greenhouse/olive.webp",
  "Olive Flounder": "/sprites/fish/olive_flounder.png",
  "Omnifeed": "/sprites/animals/foods/omnifeed.webp",
  "Onion": "/sprites/crops/onion/crop.png",
  "Orange": "/sprites/resources/orange.png",
  "Oyster": "/sprites/crustaceans/oyster.webp",
  "Parrotfish": "/sprites/fish/parrot_fish.png",
  "Parsnip": "/sprites/wearables/56.webp",
  "Pepper": "/sprites/crops/pepper/crop.png",
  "Petting Hand": "/sprites/animals/petting_hand.webp",
  "Pig": "/sprites/animals/pigs/idle.webp",
  "Pig Bristles": "/sprites/resources/pig_bristles.webp",
  "Pig Onesie": "/sprites/wearables/595.webp",
  "Pink Beetle": "/sprites/resources/beetles/pink_beetle.webp",
  "Porgy": "/sprites/fish/porgy.png",
  "Potato": "/sprites/crops/potato/crop.png",
  "Pumpkin": "/sprites/crops/pumpkin/crop.png",
  "Radish": "/sprites/crops/radish/crop.png",
  "Ray": "/sprites/fish/ray.png",
  "Red Snapper": "/sprites/fish/red_snapper.png",
  "Restless Animals": "/sprites/icons/skill_icons/restless_animals.png",
  "Rhubarb": "/sprites/crops/rhubarb/crop.png",
  "Rice": "/sprites/greenhouse/rice.webp",
  "Rich Chicken": "/sprites/animals/chickens/rich_chicken.webp",
  "Rich Slop": "/sprites/animals/food/rich_slop.webp",
  "Rock Blackfish": "/sprites/fish/rock_blackfish.png",
  "Salt Lick": "/sprites/food/salt_lick.webp",
  "Saw Shark": "/sprites/fish/saw_shark.png",
  "Sea Bass": "/sprites/fish/sea_bass.png",
  "Sea Grapes": "/sprites/crustaceans/sea_grapes.webp",
  "Sea Horse": "/sprites/fish/seahorse.png",
  "Sea Slug": "/sprites/crustaceans/sea_slug.webp",
  "Sea Snail": "/sprites/crustaceans/sea_snail.webp",
  "Sea Urchin": "/sprites/crustaceans/sea_urchin.webp",
  "Sheep": "/sprites/animals/sheep/idle.webp",
  "Sheepwise Diet": "/sprites/animals/sheep/ready.webp",
  "Shrimp": "/sprites/crustaceans/shrimp.webp",
  "Soybean": "/sprites/crops/soybean/crop.png",
  "Spa Cow": "/sprites/sfts/spa_cow.webp",
  "Spa Sheep": "/sprites/sfts/spa_sheep.webp",
  "Speed Chicken": "/sprites/animals/chickens/speed_chicken.webp",
  "Squid": "/sprites/fish/squid.png",
  "Squid Chicken": "/sprites/sfts/squid_chicken.webp",
  "Sunfish": "/sprites/fish/sunfish.png",
  "Sunflower": "/sprites/crops/sunflower/crop.png",
  "Surgeonfish": "/sprites/fish/surgeonfish.png",
  "Swill Savvy": "/sprites/animals/pigs/idle.webp",
  "Tilapia": "/sprites/fish/tilapia.png",
  "Tomato": "/sprites/fruit/tomato/tomato.webp",
  "Toxic Tuft": "/sprites/sfts/toxic_tuft.webp",
  "Training Whistle": "/sprites/wearables/501.webp",
  "Trout": "/sprites/fish/trout.png",
  "Truffle": "/sprites/resources/truffle.webp",
  "Truffle Seasoning": "/sprites/food/truffle_seasoning.webp",
  "Truffle Yield": "/sprites/resources/truffle.webp",
  "Tuna": "/sprites/fish/tuna.png",
  "Turnip": "/sprites/crops/turnip/crop.png",
  "Undead Rooster": "/sprites/animals/chickens/undead_chicken.webp",
  "Vibraphone": "/sprites/sfts/vibraphone.webp",
  "Walleye": "/sprites/fish/walleye.png",
  "Weakfish": "/sprites/fish/weak_fish.png",
  "Whale Shark": "/sprites/fish/whale_shark.png",
  "Wheat": "/sprites/crops/wheat/crop.png",
  "White Shark": "/sprites/fish/white_shark.png",
  "White Sheep Onesie": "/sprites/wearables/401.webp",
  "Wild Mushroom": "/sprites/resources/wild_mushroom.png",
  "Wool": "/sprites/resources/animals/wool.webp",
  "Wrangler": "/sprites/skills/wrangler.png",
  "Yam": "/sprites/crops/yam/crop.png",
  "Zebra Turkeyfish": "/sprites/fish/zebra_turkeyfish.png",
  "Zucchini": "/sprites/crops/zucchini/crop.png"
} as const;
