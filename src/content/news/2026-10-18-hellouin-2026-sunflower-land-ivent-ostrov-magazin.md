---
image: "/blog-images/sfl/halloween-2026/preview.png"
title: "Хэллоуин 2026 в Sunflower Land: остров ивента, мини-игра и магазин из 29 позиций"
shortId: 180
slug: "2026-10-18-hellouin-2026-sunflower-land-ivent-ostrov-magazin"
date: "2026-10-18"
category: "GitHub"
game: "sunflower"
description: "📅 Дата: 18 Октября 2026 В репозитории Sunflower Land появился PR с хэллоуинским ивентом: отдельный остров с 22 октября по 2 ноября, мини-игра Sunflower Survivors, токены и билеты ивента, магазин из пяти тиров с воронами, декорациями и вампирско-скелетной одеждой."
originalUrl: "https://github.com/sunflower-land/sunflower-land/pull/7820"
---

📅 Дата: 18 Октября 2026

В репозитории Sunflower Land появился [pull request #7820](https://github.com/sunflower-land/sunflower-land/pull/7820) от участника сообщества telk2 — он добавляет **хэллоуинский ивент 2026**: отдельный остров, мини-игру, валюту ивента, магазин и пачку новых декораций и одежды. Доска объявлений на острове встречает надписью «Welcome to the Halloween 2026 Community Event!».

> ⚠️ На момент написания PR ещё **не влит** в игру. Всё ниже — по коду из PR: цены, сроки и состав могут поменяться до релиза.

#### Когда и как попасть

- Ивент включается флагом **с 22 октября по 2 ноября 2026** (00:00 UTC).
- На острове ивента нужно попасть через **карту мира** — на время ивента там появляется новая точка в нижней части карты. Путешествовать туда можно **со 2 уровня** бампкина.

![Карта мира на время ивента — остров Хэллоуина в нижней части карты](/blog-images/sfl/halloween-2026/world-map.png)

На острове вас ждут два NPC — **Vampire Jim** и **Skelly Joe** (они полностью одеты в новые вещи ивента), доска объявлений, магазин и портал в мини-игру. Vampire Jim один раз вручает небольшой подарок — ворону **Cultist Crow**: «Here is a small reward, don't tell anyone about it...».

#### Мини-игра Sunflower Survivors — Halloween Edition

Через портал на острове запускается **Sunflower Survivors — Halloween Edition** в жанре «bullet heaven»: нужно выжить и победить злого колдуна, который пытается захватить Земли. Задача — собрать нужное количество сфер опыта: чем больше собрали, тем больше **токенов ивента** получите. В PR отдельно поправили выдачу приза, чтобы его можно было забирать повторно — судя по коду, раз в сутки.

#### Токены и билеты

- <img src="/blog-images/sfl/halloween-2026/halloween-token-2026.webp" alt="" width="56" height="56" style="width:56px;height:56px;display:inline-block;vertical-align:middle;margin:0 6px 0 0;border-radius:6px;image-rendering:pixelated">**Halloween Token 2026** — валюта магазина ивента. Не торгуется; потратить её нужно до конца ивента.
- <img src="/blog-images/sfl/halloween-2026/halloween-ticket-2026.webp" alt="" width="56" height="56" style="width:56px;height:56px;display:inline-block;vertical-align:middle;margin:0 6px 0 0;border-radius:6px;image-rendering:pixelated">**Halloween Ticket 2026** — продаётся в магазине за 100 токенов (до 10 000 штук). Билеты нужно просто держать: после окончания ивента среди держателей разыграют **$FLOWER**. По метаданным билет не торгуется.

#### Магазин ивента

Магазин разбит на пять тиров. Следующий тир открывается, когда вы купите нужное количество **разных** предметов ивента. Цены — либо в токенах ивента, либо во Flower; у большинства предметов лимит — одна штука.

##### Базовый тир — открыт сразу

| | Предмет | Тип | Цена | Лимит |
| --- | --- | --- | ---: | ---: |
| <img src="/sprites/sfts/quest/sunflower_key.png" alt="Treasure Key" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated;object-fit:contain"> | Treasure Key (Сундучный ключ) | ключ | 200 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/halloween-ticket-2026.webp" alt="Halloween Ticket 2026" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Halloween Ticket 2026 | билет | 100 токенов | до 10 000 |
| <img src="/blog-images/sfl/halloween-2026/destroyed-sign.webp" alt="Destroyed Sign" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Destroyed Sign | декорация | 10 Flower | 5 |
| <img src="/blog-images/sfl/halloween-2026/zombie-hand-toy.webp" alt="Zombie Hand Toy" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Zombie Hand Toy | декорация | 300 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/skull-candles.webp" alt="Skull Candles" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Skull Candles | декорация | 20 Flower | 10 |
| <img src="/blog-images/sfl/halloween-2026/count-vlad-crow.webp" alt="Count Vlad Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Count Vlad Crow | декорация | 200 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/lual-crow.webp" alt="Lual Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Lual Crow | декорация | 100 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/butcher-knife.webp" alt="Butcher Knife" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Butcher Knife | одежда | 30 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/vampire-footwear.webp" alt="Vampire Footwear" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Vampire Footwear | одежда | 100 токенов | 1 |

##### Редкий тир — после 6 разных предметов ивента

| | Предмет | Тип | Цена | Лимит |
| --- | --- | --- | ---: | ---: |
| <img src="/sprites/sfts/quest/rare_key.png" alt="Rare Key" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated;object-fit:contain"> | Rare Key (Редкий ключ) | ключ | 400 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/skeleton-crow.webp" alt="Skeleton Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Skeleton Crow | декорация | 20 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/fisherbird-crow.webp" alt="Fisherbird Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Fisherbird Crow | декорация | 400 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/chained-crow.webp" alt="Chained Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Chained Crow | декорация | 300 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/cool-zombie-tombstone.webp" alt="Cool Zombie Tombstone" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Cool Zombie Tombstone | декорация | 500 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/hook-and-chain.webp" alt="Hook and Chain" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Hook and Chain | одежда | 30 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/skeleton-mask.webp" alt="Skeleton Mask" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Skeleton Mask | одежда | 40 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/vampire-headwear.webp" alt="Vampire Headwear" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Vampire Headwear | одежда | 300 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/vampire-breeches.webp" alt="Vampire Breeches" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Vampire Breeches | одежда | 200 токенов | 1 |

##### Эпический тир — после 12 разных предметов

| | Предмет | Тип | Цена | Лимит |
| --- | --- | --- | ---: | ---: |
| <img src="/sprites/sfts/quest/luxury_key.png" alt="Luxury Key" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated;object-fit:contain"> | Luxury Key (Люксовый ключ) | ключ | 700 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/haunted-tv.webp" alt="Haunted TV" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Haunted TV | декорация | 400 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/witch-crow.webp" alt="Witch Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Witch Crow | декорация | 400 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/plague-crow.webp" alt="Plague Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Plague Crow | декорация | 400 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/vampire-garments.webp" alt="Vampire Garments" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Vampire Garments | одежда | 50 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/skeleton-costume.webp" alt="Skeleton Costume" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Skeleton Costume | одежда | 50 Flower | 1 |

##### Мега тир — после 16 разных предметов

| | Предмет | Тип | Цена | Лимит |
| --- | --- | --- | ---: | ---: |
| <img src="/sprites/sfts/super_totem.webp" alt="Super Totem" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated;object-fit:contain"> | Super Totem (Супер-тотем) | тотем | 2 000 токенов | 1 |
| <img src="/blog-images/sfl/halloween-2026/sky-tearer-wings.webp" alt="Sky Tearer Wings" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Sky Tearer Wings | одежда | 300 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/bat-aura.webp" alt="Bat Aura" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Bat Aura | одежда | 600 Flower | 1 |
| <img src="/blog-images/sfl/halloween-2026/scary-nights-background.webp" alt="Scary Nights Background" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Scary Nights Background | одежда | 1 000 токенов | 1 |

##### Экстра тир — после 28 разных предметов

| | Предмет | Тип | Цена | Лимит |
| --- | --- | --- | ---: | ---: |
| <img src="/blog-images/sfl/halloween-2026/huge-jack-o-lantern.webp" alt="Huge Jack-o'-lantern" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Huge Jack-o'-lantern | декорация | 1 Flower | 1 |

Все новые коллекционки — **декорации без бустов**, по метаданным они **торгуются** на маркете. Одежда в метаданных помечена как неторгуемая. Ключи (Treasure, Rare, Luxury) и Super Totem — уже существующие в игре предметы, здесь они просто продаются за токены ивента.

#### Предметы вне магазина

В PR есть ещё четыре вороны и тыква. Cultist Crow — подарок от Vampire Jim, а для остальных способ получения в этом PR не описан: их нет ни в магазине, ни в подарке.

| | Предмет | Как получить |
| --- | --- | --- |
| <img src="/blog-images/sfl/halloween-2026/cultist-crow.webp" alt="Cultist Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Cultist Crow | подарок Vampire Jim на острове ивента |
| <img src="/blog-images/sfl/halloween-2026/corrupted-pumpkin.webp" alt="Corrupted Pumpkin" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Corrupted Pumpkin | в магазине и подарке нет |
| <img src="/blog-images/sfl/halloween-2026/king-crow.webp" alt="King Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | King Crow | в магазине и подарке нет |
| <img src="/blog-images/sfl/halloween-2026/devil-crow.webp" alt="Devil Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Devil Crow | в магазине и подарке нет |
| <img src="/blog-images/sfl/halloween-2026/pharaoh-crow.webp" alt="Pharaoh Crow" width="56" height="56" style="width:56px;height:56px;display:block;margin:0;border-radius:6px;image-rendering:pixelated"> | Pharaoh Crow | в магазине и подарке нет |

#### Итог

Хэллоуин 2026 — это отдельный остров на 11 дней, мини-игра на выживание ради токенов и большой магазин из 29 позиций: 13 новых декораций с воронами и «зомби»-темой, 11 вещей вампирско-скелетного гардероба, билет розыгрыша, три ключа и Super Totem. Ещё пять декораций — вне магазина. Самое дорогое — Bat Aura за 600 Flower и Super Totem за 2 000 токенов, а гигантская тыква Huge Jack-o'-lantern стоит всего 1 Flower, но открывается только после покупки 28 разных предметов. Ждём, пока PR попадёт в игру, — если что-то изменится, обновим статью.

**Источник:** [PR #7820 — Halloween 2026 Event Island](https://github.com/sunflower-land/sunflower-land/pull/7820) на GitHub.
