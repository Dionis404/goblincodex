#!/usr/bin/env python3
"""
Миграция: добавляет поле resource к каждому бусту в boosts-catalog.json.
Классификация по английскому тексту буста.

Запуск: python3 scripts/migrate-add-resource.py
"""

import json
import os

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


def classify_resource(en_text: str) -> list:
    text_lower = en_text.lower()
    resources = []
    for resource_id, includes, excludes in RESOURCE_RULES:
        matched = any(kw.lower() in text_lower for kw in includes)
        excluded = any(kw.lower() in text_lower for kw in excludes)
        if matched and not excluded:
            resources.append(resource_id)
    return resources


def main():
    catalog_path = os.path.join("src", "data", "boosts-catalog.json")
    with open(catalog_path, encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    for item in data["items"]:
        for boost in item["boosts"]:
            boost["resource"] = classify_resource(boost["en"])
            updated += 1

    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✅ Обновлено {updated} бустов в {len(data['items'])} предметах")

    # Статистика по категориям
    counts = {}
    for item in data["items"]:
        for boost in item["boosts"]:
            for r in boost["resource"]:
                counts[r] = counts.get(r, 0) + 1
    for r, c in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"   {r}: {c} бустов")

    unclassified = sum(1 for item in data["items"] for b in item["boosts"] if not b["resource"])
    print(f"   Без категории: {unclassified}")


if __name__ == "__main__":
    main()
