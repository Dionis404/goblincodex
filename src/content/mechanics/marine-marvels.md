---
title: Морские марвелы
description: 'Как поймать редких марвелов на рыбалке — шансы, карты-фрагменты и что их увеличивает'
icon: '🐋'
order: 16
---

> ⚡ **Кратко:** Марвелы (Marine Marvels) — самые редкие виды рыбы в игре. Ни один марвел не ловится напрямую удочкой — чтобы его получить, нужно случайно найти все 9 фрагментов карты, ловя определённую обычную рыбу. Часть марвелов доступна постоянно ("базовые"), часть привязана к текущей или прошлой сюжетной главе.

## Как это работает: карта из 9 фрагментов

Для каждого марвела в игре есть одна или несколько "триггерных" рыб — обычных видов, которые вы ловите как всегда (наживка, сезон и т.д.). При каждой поимке такой рыбы есть шанс дополнительно получить **фрагмент карты** нужного марвела. Как только собраны все 9 фрагментов, карта считается собранной, и марвела можно забрать — специально ловить его самого не нужно и невозможно.

Шанс получить фрагмент карты — не то же самое, что шанс поймать саму рыбу-триггер. Сначала рыба должна клюнуть (это отдельная механика — зависит от наживки, сезона и т.п.), и только для успешной поимки считается отдельный шанс дропа фрагмента по таблице ниже.

Прямых бустов, повышающих шанс поимки самой рыбы, нет — все бусты влияют именно на шанс дропа **фрагмента карты** после того, как рыба уже поймана:

- <img class="gc-marvel-icon" src="/sprites/sfts/navigation_table.webp" alt="" /> **Navigation Table** — коллекционный предмет, +100% к шансу фрагмента карты (в игре описан как «Doubles your odds to get a map piece»).
- <img class="gc-marvel-icon" src="/sprites/wearables/255.webp" alt="" /> **Deep Sea Helm** — корона, выдаётся за milestone Deep Sea Diver, тоже +100% к шансу фрагмента карты.
- 🌕 **Full Moon** — календарное событие (раз в месяц), повышает шанс дропа фрагментов на время действия.
- 🛡️ **Season Guardian** (Spring/Summer/Autumn/Winter) — сезонная постройка, усиливающая эффект активного положительного события в свой сезон, в том числе Full Moon; недоступен без активного события.

Включайте свои активные бусты прямо у таблицы шансов — чекбоксы общие для всей страницы.

<div class="gc-marvel-boost-widget" data-shared>
  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="navigationTable" />
    <img class="gc-marvel-icon" src="/sprites/sfts/navigation_table.webp" alt="" />
    <span>Navigation Table (+100%)</span>
  </label>

  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="deepSeaHelm" />
    <img class="gc-marvel-icon" src="/sprites/wearables/255.webp" alt="" />
    <span>Deep Sea Helm (+100%)</span>
  </label>

  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="fullMoon" class="gc-fullmoon-toggle" />
    <span>🌕 Full Moon</span>
  </label>

  <label class="gc-marvel-boost-check gc-marvel-boost-check--nested">
    <input type="checkbox" data-boost="guardian" class="gc-guardian-toggle" disabled />
    <span>🛡️ Season Guardian (только вместе с Full Moon)</span>
  </label>

  <p class="gc-marvel-boost-total">
    <strong class="gc-marvel-boost-multiplier">Выберите бонус</strong>
  </p>
</div>

## Марвелы текущей главы — Salt Awakening

Привязаны к текущей главе — карты можно собирать, пока она идёт.

<div class="gc-marvel-table-wrap">

| Марвел | Триггерная рыба | Базовый шанс | Шанс с бустами |
|---|---|---|---|
| <img class="gc-marvel-icon" src="/sprites/fish/crystal_shrimp.webp" alt="" /> Crystal Shrimp | <img class="gc-marvel-icon" src="/sprites/fish/tuna.png" alt="" /> Tuna | 0.8% | <span class="gc-marvel-odds" data-base="0.8">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/crystal_shrimp.webp" alt="" /> Crystal Shrimp | <img class="gc-marvel-icon" src="/sprites/fish/sea_bass.png" alt="" /> Sea Bass | 3% | <span class="gc-marvel-odds" data-base="3">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/deep_sea_slug.webp" alt="" /> Deep Sea Slug | <img class="gc-marvel-icon" src="/sprites/fish/surgeonfish.png" alt="" /> Surgeonfish | 0.1% | <span class="gc-marvel-odds" data-base="0.1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/deep_sea_slug.webp" alt="" /> Deep Sea Slug | <img class="gc-marvel-icon" src="/sprites/fish/barred_knifejaw.png" alt="" /> Barred Knifejaw | 1% | <span class="gc-marvel-odds" data-base="1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/deep_sea_pig.webp" alt="" /> Deep Sea Pig | <img class="gc-marvel-icon" src="/sprites/fish/sunfish.png" alt="" /> Sunfish | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/deep_sea_pig.webp" alt="" /> Deep Sea Pig | <img class="gc-marvel-icon" src="/sprites/fish/coelacanth.png" alt="" /> Coelacanth | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |

</div>

## Марвелы следующей главы — Ascension Age

> 🔜 Глава Ascension Age ещё не началась (стартует 2026-08-03, сразу после окончания Salt Awakening). Данные ниже уже зашиты в код игры, но пока недоступны в игре — разработчики сами помечают марвела-талисман главы как неподтверждённый (в коде оставлен `TODO: confirm which of the 3 chapter fish is the marvel`), так что состав или шансы могут измениться до релиза.

<div class="gc-marvel-table-wrap">

| Марвел | Триггерная рыба | Базовый шанс | Шанс с бустами |
|---|---|---|---|
| <img class="gc-marvel-icon" src="/sprites/sfts/crocodile.webp" alt="" /> Crocodile | <img class="gc-marvel-icon" src="/sprites/fish/red_snapper.png" alt="" /> Red Snapper | 0.8% | <span class="gc-marvel-odds" data-base="0.8">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/crocodile.webp" alt="" /> Crocodile | <img class="gc-marvel-icon" src="/sprites/fish/moray_eel.png" alt="" /> Moray Eel | 3% | <span class="gc-marvel-odds" data-base="3">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/dumbo_octopus.webp" alt="" /> Dumbo Octopus | <img class="gc-marvel-icon" src="/sprites/fish/olive_flounder.png" alt="" /> Olive Flounder | 0.1% | <span class="gc-marvel-odds" data-base="0.1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/dumbo_octopus.webp" alt="" /> Dumbo Octopus | <img class="gc-marvel-icon" src="/sprites/fish/napoleonfish.png" alt="" /> Napoleanfish | 1% | <span class="gc-marvel-odds" data-base="1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/seahorse_dad.webp" alt="" /> Seahorse Dad | <img class="gc-marvel-icon" src="/sprites/fish/angel_fish.png" alt="" /> Angelfish | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/seahorse_dad.webp" alt="" /> Seahorse Dad | <img class="gc-marvel-icon" src="/sprites/fish/porgy.png" alt="" /> Porgy | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |

</div>

## Базовые марвелы (доступны постоянно)

Эти пять марвелов не привязаны ни к одной главе — их карты можно собирать в любое время:

<div class="gc-marvel-boost-widget" data-shared>
  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="navigationTable" />
    <img class="gc-marvel-icon" src="/sprites/sfts/navigation_table.webp" alt="" />
    <span>Navigation Table (+100%)</span>
  </label>

  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="deepSeaHelm" />
    <img class="gc-marvel-icon" src="/sprites/wearables/255.webp" alt="" />
    <span>Deep Sea Helm (+100%)</span>
  </label>

  <label class="gc-marvel-boost-check">
    <input type="checkbox" data-boost="fullMoon" class="gc-fullmoon-toggle" />
    <span>🌕 Full Moon</span>
  </label>

  <label class="gc-marvel-boost-check gc-marvel-boost-check--nested">
    <input type="checkbox" data-boost="guardian" class="gc-guardian-toggle" disabled />
    <span>🛡️ Season Guardian (только вместе с Full Moon)</span>
  </label>

  <p class="gc-marvel-boost-total">
    <strong class="gc-marvel-boost-multiplier">Выберите бонус</strong>
  </p>
</div>

<div class="gc-marvel-table-wrap">

| Марвел | Триггерная рыба | Базовый шанс | Шанс с бустами |
|---|---|---|---|
| <img class="gc-marvel-icon" src="/sprites/fish/starlight_tuna.png" alt="" /> Starlight Tuna | <img class="gc-marvel-icon" src="/sprites/fish/halibut.png" alt="" /> Halibut | 2.5% | <span class="gc-marvel-odds" data-base="2.5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/starlight_tuna.png" alt="" /> Starlight Tuna | <img class="gc-marvel-icon" src="/sprites/fish/horse_mackerel.png" alt="" /> Horse Mackerel | 36% | <span class="gc-marvel-odds" data-base="36">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/twilight_anglerfish.png" alt="" /> Twilight Anglerfish | <img class="gc-marvel-icon" src="/sprites/fish/clownfish.png" alt="" /> Clownfish | 2.5% | <span class="gc-marvel-odds" data-base="2.5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/twilight_anglerfish.png" alt="" /> Twilight Anglerfish | <img class="gc-marvel-icon" src="/sprites/fish/parrot_fish.png" alt="" /> Parrotfish | 21% | <span class="gc-marvel-odds" data-base="21">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/gilded_swordfish.png" alt="" /> Gilded Swordfish | <img class="gc-marvel-icon" src="/sprites/fish/rock_blackfish.png" alt="" /> Rock Blackfish | 5% | <span class="gc-marvel-odds" data-base="5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/gilded_swordfish.png" alt="" /> Gilded Swordfish | <img class="gc-marvel-icon" src="/sprites/fish/white_shark.png" alt="" /> White Shark | 30% | <span class="gc-marvel-odds" data-base="30">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/radiant_ray.png" alt="" /> Radiant Ray | <img class="gc-marvel-icon" src="/sprites/fish/trout.png" alt="" /> Trout | 2% | <span class="gc-marvel-odds" data-base="2">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/radiant_ray.png" alt="" /> Radiant Ray | <img class="gc-marvel-icon" src="/sprites/fish/hammerhead_shark.png" alt="" /> Hammerhead shark | 5% | <span class="gc-marvel-odds" data-base="5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/phantom_barracuda.png" alt="" /> Phantom Barracuda | <img class="gc-marvel-icon" src="/sprites/fish/mahi_mahi.png" alt="" /> Mahi Mahi | 0.18% | <span class="gc-marvel-odds" data-base="0.18">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/phantom_barracuda.png" alt="" /> Phantom Barracuda | <img class="gc-marvel-icon" src="/sprites/fish/squid.png" alt="" /> Squid | 5% | <span class="gc-marvel-odds" data-base="5">Выберите бонус</span> |

</div>

## Марвелы прошлых глав

### Crabs and Traps

<div class="gc-marvel-table-wrap">

| Марвел | Триггерная рыба | Базовый шанс | Шанс с бустами |
|---|---|---|---|
| <img class="gc-marvel-icon" src="/sprites/fish/isopod.webp" alt="" /> Giant Isopod | <img class="gc-marvel-icon" src="/sprites/fish/anchovy.png" alt="" /> Anchovy | 0.8% | <span class="gc-marvel-odds" data-base="0.8">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/isopod.webp" alt="" /> Giant Isopod | <img class="gc-marvel-icon" src="/sprites/fish/oarfish.png" alt="" /> Oarfish | 3% | <span class="gc-marvel-odds" data-base="3">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/nautilus.webp" alt="" /> Nautilus | <img class="gc-marvel-icon" src="/sprites/fish/seahorse.png" alt="" /> Sea Horse | 1% | <span class="gc-marvel-odds" data-base="1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/nautilus.webp" alt="" /> Nautilus | <img class="gc-marvel-icon" src="/sprites/fish/tuna.png" alt="" /> Tuna | 0.2% | <span class="gc-marvel-odds" data-base="0.2">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/dollocaris.webp" alt="" /> Dollocaris | <img class="gc-marvel-icon" src="/sprites/fish/sunfish.png" alt="" /> Sunfish | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/fish/dollocaris.webp" alt="" /> Dollocaris | <img class="gc-marvel-icon" src="/sprites/fish/football_fish.png" alt="" /> Football fish | 0.5% | <span class="gc-marvel-odds" data-base="0.5">Выберите бонус</span> |

</div>

### Paw Prints

<div class="gc-marvel-table-wrap">

| Марвел | Триггерная рыба | Базовый шанс | Шанс с бустами |
|---|---|---|---|
| <img class="gc-marvel-icon" src="/sprites/sfts/starfish_marvel.webp" alt="" /> Super Star | <img class="gc-marvel-icon" src="/sprites/fish/red_snapper.png" alt="" /> Red Snapper | 1% | <span class="gc-marvel-odds" data-base="1">Выберите бонус</span> |
| <img class="gc-marvel-icon" src="/sprites/sfts/starfish_marvel.webp" alt="" /> Super Star | <img class="gc-marvel-icon" src="/sprites/fish/whale_shark.png" alt="" /> Whale Shark | 10% | <span class="gc-marvel-odds" data-base="10">Выберите бонус</span> |

</div>

### Архив (данные не сохранились)

Эти марвелы тоже привязаны к главам, но триггеры и точные шансы дропа фрагментов для них в текущей версии игры больше не хранятся — их главы уже завершились раньше, и данные были вычищены из кода.

| Марвел | Глава |
|---|---|
| <img class="gc-marvel-icon" src="/sprites/fish/crimson_carp.png" alt="" /> Crimson Carp | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/fish/battle_fish.webp" alt="" /> Battle Fish | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/fish/lemon_shark.webp" alt="" /> Lemon Shark | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/fish/cow_fish.webp" alt="" /> Longhorn Cowfish | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/fish/pink_dolphin.webp" alt="" /> Pink Dolphin | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/sfts/poseidon_fish.webp" alt="" /> Poseidon | архивная глава |
| <img class="gc-marvel-icon" src="/sprites/fish/jellyfish.webp" alt="" /> Jellyfish | архивная глава |

<style>
  .gc-marvel-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
    image-rendering: pixelated;
    vertical-align: middle;
    margin-right: 4px;
  }
  .gc-marvel-boost-widget {
    background: var(--card-bg, #fff);
    border: 1px solid var(--border, #e2e2e2);
    border-radius: var(--radius, 12px);
    padding: 14px 18px;
    margin: 12px 0 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 20px;
  }
  .gc-marvel-boost-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }
  .gc-marvel-boost-check input {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
  }
  .gc-marvel-boost-check .gc-marvel-icon {
    margin-right: 0;
  }
  .gc-marvel-boost-check--nested {
    padding-left: 12px;
    border-left: 2px solid var(--border, #e2e2e2);
  }
  .gc-marvel-boost-check input:disabled {
    cursor: not-allowed;
  }
  .gc-marvel-boost-check:has(input:disabled) {
    opacity: 0.5;
  }
  .gc-marvel-boost-total {
    margin: 0 0 0 auto;
    font-size: 13px;
  }
  .gc-marvel-table-wrap {
    overflow-x: auto;
  }
  .gc-marvel-odds {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .gc-marvel-odds.gc-marvel-odds--boosted {
    color: var(--green-dark, #2f7a4f);
  }
</style>

<script>
  (function () {
    function init() {
      const widgets = document.querySelectorAll('.gc-marvel-boost-widget');
      if (!widgets.length) return;

      const state = { navigationTable: false, deepSeaHelm: false, fullMoon: false, guardian: false };

      function syncGuardianAvailability() {
        widgets.forEach((widget) => {
          const guardianToggle = widget.querySelector('.gc-guardian-toggle');
          if (!(guardianToggle instanceof HTMLInputElement)) return;
          guardianToggle.disabled = !state.fullMoon;
          if (!state.fullMoon) guardianToggle.checked = false;
        });
        if (!state.fullMoon) state.guardian = false;
      }

      function applyStateToInputs() {
        widgets.forEach((widget) => {
          widget.querySelectorAll('input[data-boost]').forEach((el) => {
            if (!(el instanceof HTMLInputElement)) return;
            const key = el.getAttribute('data-boost');
            if (key && key in state) el.checked = state[key];
          });
        });
      }

      function recalc() {
        let multiplier = 1;
        if (state.navigationTable) multiplier += 1;
        if (state.deepSeaHelm) multiplier += 1;
        if (state.fullMoon) multiplier += 1;
        if (state.guardian) multiplier += 1;

        document.querySelectorAll('.gc-marvel-boost-multiplier').forEach((el) => {
          el.textContent = multiplier > 1 ? ('Множитель: ×' + multiplier) : 'Выберите бонус';
        });

        document.querySelectorAll('.gc-marvel-odds').forEach((el) => {
          if (multiplier <= 1) {
            el.textContent = 'Выберите бонус';
            el.classList.remove('gc-marvel-odds--boosted');
            return;
          }
          const base = parseFloat(el.getAttribute('data-base') || '0');
          const boosted = base * multiplier;
          el.textContent = (Math.round(boosted * 100) / 100) + '%';
          el.classList.add('gc-marvel-odds--boosted');
        });
      }

      document.addEventListener('change', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLInputElement)) return;
        const key = target.getAttribute('data-boost');
        if (!key || !(key in state) || !target.closest('.gc-marvel-boost-widget')) return;

        state[key] = target.checked;
        syncGuardianAvailability();
        applyStateToInputs();
        recalc();
      });

      syncGuardianAvailability();
      applyStateToInputs();
      recalc();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
</script>
