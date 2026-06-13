#!/usr/bin/env python3
"""
Экстрактор бустов из репозитория Sunflower Land.
Парсит collectibleItemBuffs.ts и bumpkinItemBuffs.ts,
подставляет переводы из en.json / ru.json,
маппит спрайты и выгружает boosts-catalog.json.

Запуск: python3 scripts/extract-sfl-boosts.py --sfl-dir ./sunflower-land --out ./src/data
"""

import argparse
import json
import re
import os
import shutil
from datetime import datetime, timezone


def parse_args():
    p = argparse.ArgumentParser(description="Extract SFL boost data")
    p.add_argument("--sfl-dir", required=True, help="Path to cloned sunflower-land repo")
    p.add_argument("--out", default="./src/data", help="Output directory for JSON")
    p.add_argument("--sprites-out", default="./public/sprites", help="Output directory for sprite files")
    p.add_argument("--copy-sprites", action="store_true", help="Copy sprite files from SFL repo")
    return p.parse_args()


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read_file(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def extract_translate_keys_and_types(chunk: str):
    """Извлекает пары (translate_key, labelType) из блока кода."""
    keys = re.findall(r'translate\(\s*"([^"]+)"\s*\)', chunk)
    types = re.findall(r'labelType:\s*"([^"]+)"', chunk)
    # Дополняем types до длины keys (на случай пропусков)
    while len(types) < len(keys):
        types.append("success")
    return list(zip(keys, types))


def find_block_end(text: str, start: int, open_char="[", close_char="]") -> int:
    """Находит позицию закрывающей скобки с учётом вложенности."""
    depth = 1
    pos = start
    while pos < len(text) and depth > 0:
        if text[pos] == open_char:
            depth += 1
        elif text[pos] == close_char:
            depth -= 1
        pos += 1
    return pos


def build_sprite_map(images_ts: str) -> dict:
    """Строит маппинг 'Item Name' → 'sfts/filename.webp' из images.ts."""
    # Все импорты ассетов
    all_imports = dict(re.findall(r'import (\w+) from "assets/([^"]+)"', images_ts))

    detail_items = {}
    for m in re.finditer(r'"([^"]+)":\s*\{', images_ts):
        name = m.group(1)
        chunk = images_ts[m.end(): m.end() + 400]
        img_match = re.search(r'image:\s*(\w+)', chunk)
        if img_match and img_match.group(1) in all_imports:
            detail_items[name] = all_imports[img_match.group(1)]
    return detail_items


def build_wearable_id_map(bumpkin_ts: str) -> dict:
    """Строит маппинг 'Wearable Name' → ID из ITEM_IDS."""
    start = bumpkin_ts.index("ITEM_IDS")
    end = bumpkin_ts.index("};", start) + 1
    block = bumpkin_ts[start:end]
    return {name: int(wid) for name, wid in re.findall(r'"([^"]+)":\s*(\d+)', block)}


def build_known_ids(index_ts: str) -> dict:
    """Строит маппинг 'Item Name' → on-chain token ID из KNOWN_IDS."""
    end_marker = "KNOWN_ITEMS"
    end = index_ts.index(end_marker) if end_marker in index_ts else len(index_ts)
    block = index_ts[:end]
    return {name: int(tid) for name, tid in re.findall(r'"([^"]+)":\s*(\d+)', block)}


def find_item_description(item_name: str, en: dict, ru: dict) -> dict:
    """Ищет описание предмета (не буста) в словарях переводов."""
    slug = item_name.lower().replace("'", "").replace(" ", ".")
    candidates = [
        k for k in en
        if k.startswith(f"description.{slug}")
        and ".boost" not in k
        and ".aoe" not in k
        and ".warning" not in k
        and ".skill" not in k
    ]
    if candidates:
        key = candidates[0]
        return {"en": en.get(key, ""), "ru": ru.get(key, "")}
    return {"en": "", "ru": ""}


RESOURCE_RULES = [
    ("wood",      ["Wood", "Tree"],    ["Driftwood"]),
    ("stone",     ["Stone"],           ["Crimstone", "Sunstone", "Moonstone"]),
    ("gold",      ["Gold"],            ["Golden Egg", "Goldensnout"]),
    ("iron",      ["Iron"],            []),
    ("crimstone", ["Crimstone"],       []),
    ("sunstone",  ["Sunstone"],        []),
    ("crop",      [
        "Crop", "Growth Time", "Potato", "Corn", "Wheat", "Carrot",
        "Cabbage", "Pumpkin", "Radish", "Beetroot", "Cauliflower",
        "Parsnip", "Eggplant", "Sunflower", "Kale", "Soybean", "Barley",
    ], []),
    ("animal",    [
        "Egg", "Animal", "Chicken", "Cow", "Sheep", "Feather",
        "Wool", "Milk", "Feed",
    ], ["Eggplant"]),
    ("cooking",   ["Cooking", "Food", "Cook"],  []),
    ("fishing",   ["Fish", "Fishing"],           []),
    ("fruit",     [
        "Fruit", "Banana", "Apple", "Orange", "Blueberry", "Lemon", "Tomato",
    ], []),
    ("flower",    ["Flower"],          ["Cauliflower", "Sunflower"]),
    ("honey",     ["Honey"],           []),
    ("oil",       ["Oil"],             ["Soil"]),
]


def classify_resource(en_text: str) -> list[str]:
    """Определяет ресурсные категории буста по английскому тексту."""
    text_lower = en_text.lower()
    resources = []
    for resource_id, includes, excludes in RESOURCE_RULES:
        matched = any(kw.lower() in text_lower for kw in includes)
        excluded = any(kw.lower() in text_lower for kw in excludes)
        if matched and not excluded:
            resources.append(resource_id)
    return resources


def extract_collectibles(buffs_ts: str, en: dict, ru: dict, sprite_map: dict, known_ids: dict):
    """Парсит collectibleItemBuffs.ts."""
    items = []
    # Паттерн: "Item Name": (xxx) => [
    for m in re.finditer(r'"([^"]+)":\s*\([^)]*\)\s*=>\s*\[', buffs_ts):
        name = m.group(1)
        end = find_block_end(buffs_ts, m.end())
        chunk = buffs_ts[m.end():end]

        pairs = extract_translate_keys_and_types(chunk)
        boosts = []
        for key, label_type in pairs:
            en_text = en.get(key, "")
            boosts.append({
                "key": key,
                "en": en_text,
                "ru": ru.get(key, ""),
                "type": label_type,  # success=yield, info=time, vibrant=special, danger=warning
                "resource": classify_resource(en_text),
                "withSkill": ".skill" in key,
            })

        items.append({
            "name": name,
            "type": "collectible",
            "description": find_item_description(name, en, ru),
            "boosts": boosts,
            "sprite": sprite_map.get(name),
            "tokenId": known_ids.get(name, 0),
        })
    return items


def extract_wearables(wbuffs_ts: str, en: dict, ru: dict, wearable_ids: dict, known_ids: dict):
    """Парсит bumpkinItemBuffs.ts (SPECIAL_ITEM_LABELS + BUMPKIN_ITEM_BUFF_LABELS)."""
    items = []
    for m in re.finditer(r'"([^"]+)":\s*\[', wbuffs_ts):
        name = m.group(1)
        end = find_block_end(wbuffs_ts, m.end())
        chunk = wbuffs_ts[m.end():end]

        pairs = extract_translate_keys_and_types(chunk)
        boosts = []
        for key, label_type in pairs:
            en_text = en.get(key, "")
            boosts.append({
                "key": key,
                "en": en_text,
                "ru": ru.get(key, ""),
                "type": label_type,
                "resource": classify_resource(en_text),
                "withSkill": False,
            })

        wid = wearable_ids.get(name)
        sprite = f"wearables/{wid}.webp" if wid else None
        token_id = known_ids.get(name, wid or 0)

        items.append({
            "name": name,
            "type": "wearable",
            "description": {"en": "", "ru": ""},
            "boosts": boosts,
            "sprite": sprite,
            "tokenId": token_id,
        })
    return items


def copy_sprites(sfl_dir: str, catalog: list, sprites_out: str):
    """Копирует спрайты из репо SFL в public/sprites/."""
    os.makedirs(os.path.join(sprites_out, "sfts"), exist_ok=True)
    os.makedirs(os.path.join(sprites_out, "wearables"), exist_ok=True)

    copied = 0
    for item in catalog:
        sprite = item.get("sprite")
        if not sprite:
            continue

        if sprite.startswith("wearables/"):
            src = os.path.join(sfl_dir, "src", "assets", sprite)
        else:
            src = os.path.join(sfl_dir, "src", "assets", sprite)

        dst = os.path.join(sprites_out, sprite)
        os.makedirs(os.path.dirname(dst), exist_ok=True)

        if os.path.exists(src):
            shutil.copy2(src, dst)
            copied += 1

    print(f"  Скопировано спрайтов: {copied}/{len(catalog)}")


def main():
    args = parse_args()
    sfl = args.sfl_dir
    types_dir = os.path.join(sfl, "src", "features", "game", "types")
    i18n_dir = os.path.join(sfl, "src", "lib", "i18n", "dictionaries")

    print("Загрузка словарей...")
    en = load_json(os.path.join(i18n_dir, "en.json"))
    ru = load_json(os.path.join(i18n_dir, "ru.json"))
    print(f"  EN: {len(en)} ключей, RU: {len(ru)} ключей")

    print("Построение карты спрайтов...")
    images_ts = read_file(os.path.join(types_dir, "images.ts"))
    sprite_map = build_sprite_map(images_ts)
    print(f"  Спрайтов в images.ts: {len(sprite_map)}")

    print("Загрузка ID...")
    bumpkin_ts = read_file(os.path.join(types_dir, "bumpkin.ts"))
    wearable_ids = build_wearable_id_map(bumpkin_ts)
    index_ts = read_file(os.path.join(types_dir, "index.ts"))
    known_ids = build_known_ids(index_ts)
    print(f"  KNOWN_IDS: {len(known_ids)}, ITEM_IDS: {len(wearable_ids)}")

    print("Извлечение коллекционок...")
    buffs_ts = read_file(os.path.join(types_dir, "collectibleItemBuffs.ts"))
    collectibles = extract_collectibles(buffs_ts, en, ru, sprite_map, known_ids)
    print(f"  Найдено: {len(collectibles)}")

    print("Извлечение одежды...")
    wbuffs_ts = read_file(os.path.join(types_dir, "bumpkinItemBuffs.ts"))
    wearables = extract_wearables(wbuffs_ts, en, ru, wearable_ids, known_ids)
    print(f"  Найдено: {len(wearables)}")

    catalog = sorted(collectibles + wearables, key=lambda x: (x["type"], x["name"]))

    # Метаданные
    result = {
        "version": "auto",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "stats": {
            "collectibles": len(collectibles),
            "wearables": len(wearables),
            "total": len(catalog),
            "withSprite": sum(1 for x in catalog if x["sprite"]),
        },
        "items": catalog,
    }

    # Выгрузка JSON
    os.makedirs(args.out, exist_ok=True)
    out_path = os.path.join(args.out, "boosts-catalog.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"\n✅ Каталог записан: {out_path}")
    print(f"   Всего: {len(catalog)} предметов, {result['stats']['withSprite']} со спрайтами")

    # Копирование спрайтов
    if args.copy_sprites:
        print("Копирование спрайтов...")
        copy_sprites(sfl, catalog, args.sprites_out)

    print("\nГотово!")


if __name__ == "__main__":
    main()