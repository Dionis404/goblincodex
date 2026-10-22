/**
 * Справочник рыбы: поверх сгенерированных данных игры (fishData.generated.ts —
 * scripts/sync-fish-data.ts) добавляет русские подписи, иконки и вспомогательные
 * выборки. Сами числа (наживка, сезоны, приманка, шансы карт) здесь не дублируются.
 */
import { FISH_RECORDS, GUARANTEED_CATCH, type FishRecord } from './fishData.generated';

export type { FishRecord };

export const TIER_ORDER = ['basic', 'advanced', 'expert'] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_LABELS: Record<Tier, string> = {
  basic: 'Базовая',
  advanced: 'Продвинутая',
  expert: 'Эксперт',
};

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export const SEASON_INFO: Record<string, { label: string; emoji: string }> = {
  spring: { label: 'Весна', emoji: '🌸' },
  summer: { label: 'Лето', emoji: '☀️' },
  autumn: { label: 'Осень', emoji: '🍂' },
  winter: { label: 'Зима', emoji: '❄️' },
};

/** Наживка: червь выбирает, какая рыба может клюнуть; Fishing Lure — покупная универсальная. */
export const BAIT_INFO: Record<string, { label: string; icon: string }> = {
  Earthworm: { label: 'Земляной червь', icon: '/sprites/composters/earthworm.png' },
  Grub: { label: 'Личинка', icon: '/sprites/composters/grub.png' },
  'Red Wiggler': { label: 'Красный червь', icon: '/sprites/composters/red_wiggler.png' },
  'Fishing Lure': { label: 'Блесна', icon: '/sprites/composters/fishing_lure.png' },
};
export const BAIT_ORDER = ['Earthworm', 'Grub', 'Red Wiggler', 'Fishing Lure'];

/** Гарантирующие наживки (GUARANTEED_CATCH): выбираешь рыбу из списка — она и клюёт. */
export const GUARANTEED_INFO: Record<string, { tier: string; icon: string }> = {
  'Fish Flake': { tier: 'Обычная рыба', icon: '/sprites/processedFoods/fish_flake.webp' },
  'Fish Stick': { tier: 'Продвинутая рыба', icon: '/sprites/processedFoods/fish_stick.webp' },
  'Fish Oil': { tier: 'Редкая рыба', icon: '/sprites/processedFoods/fish_oil.webp' },
  'Crab Stick': { tier: 'Редкая рыба', icon: '/sprites/processedFoods/crab_stick.webp' },
};
export const GUARANTEED_ORDER = ['Fish Flake', 'Fish Stick', 'Fish Oil', 'Crab Stick'];

const FISH_ICON_FILES: Record<string, string> = {
  Anchovy: 'anchovy.png', Butterflyfish: 'butterfly_fish.png', Blowfish: 'blowfish.png',
  Clownfish: 'clownfish.png', 'Sea Bass': 'sea_bass.png', 'Sea Horse': 'seahorse.png',
  'Horse Mackerel': 'horse_mackerel.png', Halibut: 'halibut.png', Squid: 'squid.png',
  'Red Snapper': 'red_snapper.png', 'Moray Eel': 'moray_eel.png', 'Olive Flounder': 'olive_flounder.png',
  Napoleanfish: 'napoleonfish.png', Surgeonfish: 'surgeonfish.png', 'Zebra Turkeyfish': 'zebra_turkeyfish.png',
  Angelfish: 'angel_fish.png', Ray: 'ray.png', 'Hammerhead shark': 'hammerhead_shark.png',
  'Barred Knifejaw': 'barred_knifejaw.png', Tuna: 'tuna.png', 'Mahi Mahi': 'mahi_mahi.png',
  'Blue Marlin': 'blue_marlin.png', Oarfish: 'oarfish.png', 'Football fish': 'football_fish.png',
  Sunfish: 'sunfish.png', Coelacanth: 'coelacanth.png', Parrotfish: 'parrot_fish.png',
  'Whale Shark': 'whale_shark.png', 'Saw Shark': 'saw_shark.png', 'White Shark': 'white_shark.png',
  Porgy: 'porgy.png', Muskellunge: 'muskellunge.png', Trout: 'trout.png', Walleye: 'walleye.png',
  Weakfish: 'weak_fish.png', 'Rock Blackfish': 'rock_blackfish.png', Cobia: 'copia.png', Tilapia: 'tilapia.png',
};

/** null — иконки нет. */
export function fishIcon(name: string): string | null {
  const file = FISH_ICON_FILES[name];
  return file ? `/sprites/fish/${file}` : null;
}

/** Обычная рыба: у неё есть наживка, сезоны и приманка. Марвелов в справочнике нет. */
export function regularFish(): FishRecord[] {
  return FISH_RECORDS.filter((f) => (TIER_ORDER as readonly string[]).includes(f.type));
}

/** Какие гарантирующие наживки покрывают эту рыбу. */
export function guaranteedBaitsFor(fish: string): string[] {
  return GUARANTEED_ORDER.filter((bait) => GUARANTEED_CATCH[bait]?.includes(fish));
}

export { GUARANTEED_CATCH };
