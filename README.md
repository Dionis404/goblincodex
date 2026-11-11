# 🌻 GoblinCodex

Открытая база знаний по [Sunflower Land](https://sunflower-land.com/) и Yakkamon, собранная фанатами для фанатов: гайды, разборы механик, новости, инструменты и каталог NFT-предметов, Bud'ов и питомцев.

Некоммерческий фан-проект, не аффилированный с командой разработчиков игры.

🔗 **[goblincodex.fun](https://goblincodex.fun)** · **[goblincodex.ru](https://goblincodex.ru)**

Сайт разделён на три раздела, каждый живёт на своём поддомене (`src/lib/subdomains.ts`, маршрутизация в `src/middleware.ts` — поддомен отдаёт содержимое своего раздела по корню, с основного домена пути уводят 302-редиректом):

| Раздел | Поддомен | Что внутри |
|---|---|---|
| **Sunflower Land** | [sfl.goblincodex.fun](https://sfl.goblincodex.fun) | Кодекс: гайды и механики, справочник, каталоги Bud'ов и питомцев, лидерборды сообщества, история аукционов, цены с маркетплейса |
| **Новости и блог** | [blog.goblincodex.fun](https://blog.goblincodex.fun) | Новости (перенесены с Телетайпа на сайт), посты Telegram-канала |
| **Yakkamon** | [yakk.goblincodex.fun](https://yakk.goblincodex.fun) | Раздел по игре Yakkamon (`src/content/yakkamon`) |

На основном домене остаются главная, страницы `/about`, `/tools`, `/donate`, `/profile/[username]`, `/terms`, `/cookies`, `/chat-rules` и API-эндпоинты.

## ✨ Основные разделы

- **Кодекс** (`/codex` на sfl-поддомене) — статьи-гайды и разборы игровых механик (`src/content/guides`, `src/content/mechanics`) с фильтрацией по трейтам, плюс Справочник с игровыми константами
- **Каталог NFT** — Bud'ы и NFT/обычные питомцы с переключателем RU/EN и сравнением до 3 Bud'ов (в т.ч. по прямой ссылке `?compare=id-id`)
- **История аукционов и цены** (`/codex/auctions-history`, `/codex/prices`) — результаты аукционов по главам, история и текущие цены с маркетплейса, курс монет к Flower
- **Лидерборды сообщества** (`/codex/community`) — рейтинги фермеров (LP, тикеты)
- **Новости** (`/news` на blog-поддомене) — статьи в `src/content/news` (импортированы с Телетайпа) и посты Telegram-канала `@URGSFL`
- **Инструменты** (`/tools`) — калькулятор расширений (`/tools/expansion-calculator`), калькулятор опыта (`/tools/xp-calculator`), проверка шансов PRNG (`/tools/prng-checker`)
- **Калькулятор стоимости инструментов** — встроен в Справочник Кодекса (`src/components/tools/ToolCostCalculator.tsx`, данные — `src/lib/toolCosts.ts`)
- **Профили** — публичные страницы фермеров (`/profile/[username]`)
- **Донаты** — отдельная страница `/donate`
- **Поиск** — семантический поиск (нейропоиск) по гайдам, механикам и Справочнику через эмбеддинги (routerai.ru)

## 📥 Откуда берутся данные и как их обновлять

| Данные | Источник | Как обновляется |
|---|---|---|
| Предметы, баффы, теги, Bud'ы, питомцы | Исходники [sunflower-land](https://github.com/sunflower-land/sunflower-land) (типы, i18n-словари, ассеты) | `npm run sfl:clone` → `sfl:populate`, вручную по мере выхода новых версий игры. Апсертит в PostgreSQL, не удаляет — устаревшие строки помечаются `is_active=false` |
| Спрайты предметов | Тот же клон SFL | `npm run sfl:sync-sprites` → копирует в `public/sprites/` |
| Иконки скиллов | Тот же клон SFL | `npm run sfl:sync-skill-icons` → копирует спрайты и печатает мэппинг для ручной вставки в `src/lib/skills.ts` |
| Табличные данные (рыба, компостер, ферментация, животные, цветы, подарки NPC, трейд-айтемы) | Тот же клон SFL | Отдельные `npm run sfl:sync-*` скрипты |
| Гайды и механики | Пишутся вручную | Markdown-файлы в `src/content/guides` / `src/content/mechanics` — правится как обычный контент, коммитится в репозиторий |
| Yakkamon-контент | Пишется вручную | Markdown-файлы в `src/content/yakkamon` |
| Справочник (таблицы игровых констант, калькулятор стоимости инструментов) | Исходники SFL + ручной ввод | Хардкод-данные в `src/components/ReferenceCatalog.tsx` (+ `src/lib/toolCosts.ts`), обновляется вручную при изменении механик игры |
| Эмбеддинги для поиска | Тексты гайдов/механик/справочника | `npm run search:index` — пересчитывает после любого изменения контента гайдов/механик |
| Новости | Телетайп | `npm run news:import` импортирует статьи в `src/content/news`, `npm run news:sync-images` подтягивает изображения; короткие ID — `npm run assign-news-short-ids` |
| Посты Telegram-канала | @URGSFL | Новые посты пишет фоновый сервис `goblin-bot` (long-polling); историю до его запуска один раз догрузили через `npm run telegram:backfill` |
| Профили фермеров | Игровой API фермы (goblin-api) | Проксируется на лету через `/api/farm/*` (`PUBLIC_API_BASE`), в БД не хранится |
| История аукционов, цены маркетплейса, курс к Flower | goblin-api | Подтягиваются на лету при рендере (`src/lib/auctionsApi.ts`, `src/lib/goblinApi.ts`), кэшируются в памяти |

Подробности по каждому скрипту синхронизации, порядку миграций БД и полному первоначальному сетапу — в [scripts/README.md](scripts/README.md).

## 🧱 Стек

[Astro](https://astro.build) 6 (SSR, `output: 'server'`, адаптер `@astrojs/node`) + [React](https://react.dev) 19 для интерактивных островков, PostgreSQL (`pg`), деплой в Docker (`node:22-alpine`).

## 🚀 Быстрый старт

```sh
npm install
npm run dev        # http://localhost:4321
```

| Команда | Действие |
|---|---|
| `npm run dev` | Локальный дев-сервер |
| `npm run build` | Продакшен-сборка в `./dist/` |
| `npm run preview` | Локальный просмотр сборки |
| `npm run check` | Проверка типов (`astro check`) |

Полный список команд синхронизации данных (`sfl:*`, `search:index`, `news:*`, `telegram:backfill`) — в [scripts/README.md](scripts/README.md).

### Переменные окружения

См. [.env.example](.env.example) за полным списком. Ключевые:

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | Строка подключения PostgreSQL (в docker-compose — хост `postgres`, не localhost) |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API, для счётчика подписчиков канала |
| `ADMIN_TELEGRAM_ID` | Чат для уведомлений о негативных оценках поиска |
| `ROUTERAI_API_KEY` | API-ключ routerai.ru для эмбеддингов семантического поиска |
| `PUBLIC_API_BASE` | Базовый URL для проксирования `/api/farm/*` (по умолчанию `/api`) |

## 🗂️ Структура

```text
/
├── src/
│   ├── pages/          # маршруты (Astro), включая API-эндпоинты в pages/api
│   │   ├── codex/      # Кодекс SFL (sfl-поддомен): гайды, аукционы, цены, рейтинги
│   │   ├── news/       # новости (blog-поддомен)
│   │   ├── yakkamon/   # раздел Yakkamon (yakk-поддомен)
│   │   ├── tools/      # калькуляторы и утилиты
│   │   └── profile/    # публичные профили фермеров
│   ├── components/     # Astro/React-компоненты
│   ├── content/        # коллекции контента: guides, mechanics, news, yakkamon
│   ├── layouts/        # общие лэйауты
│   ├── lib/            # данные и утилиты (subdomains.ts, auctionsApi.ts, goblinApi.ts …)
│   ├── middleware.ts   # роутинг поддоменов + rate-limit на /api/*
│   ├── data/           # статические данные
├── scripts/            # синхронизация игровых данных из SFL в PostgreSQL
├── public/             # статика, спрайты
└── docker-compose.yml, Dockerfile, nginx/
```

## 🗺️ Роадмап

Актуальный роадмап с полным списком фич — на странице [/about](https://goblincodex.fun/about) сайта (карточки берутся из `src/pages/about.astro`, правится вручную по мере готовности фич).

Коротко, на текущий момент:

- **Q1–Q3 2026 — готово:** инфраструктура и дизайн-система, база знаний, страница инструментов, Telegram-посты и счётчики подписчиков, семантический поиск, лидерборд тикетов, база данных NFT-предметов.
- **Q4 2026 — в работе (часть фич уже готова):** разделение сайта на Sunflower Land и Yakkamon ✅, перенос новостей с Телетайпа на сайт ✅, история аукционов и страница цен с маркетплейса ✅, курс монет к Flower ✅, калькулятор стоимости инструментов ✅, цены во Flower в справочнике и калькуляторах ✅. Осталось: гайд по главе 16 Cave Dwellers, рецепты крафта, стоимость кормления животных, калькулятор прибыли культур, автосверка цифр с кодом игры, цены маркетплейса на карточках предметов, доработка дизайна.
- **Q1 2027 — в планах:** «Моя ферма» по Farm ID, окупаемость NFT-бустов, история курса монет на графике.
- **Дальше:** уведомления в Telegram-боте, калькулятор доставок и заданий (chores), кнопка «Нашли ошибку?» под гайдами.

## 🤝 Контрибьютить

Проект открытый — можно предложить гайд, статью или идею. Проще всего написать в Telegram-чат, там же можно задать вопросы по проекту.

## 📬 Контакты

- Telegram-чат: [t.me/URGSFL](https://t.me/URGSFL)
- GitHub: [github.com/Dionis404/goblincodex](https://github.com/Dionis404/goblincodex)
- Поддержать проект: [goblincodex.fun/donate](https://goblincodex.fun/donate)
