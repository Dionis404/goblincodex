# 🌻 GoblinCodex

Открытая база знаний по [Sunflower Land](https://sunflower-land.com/), собранная фанатами для фанатов: гайды, разборы механик, новости, инструменты и каталог NFT-предметов, Bud'ов и питомцев.

Некоммерческий фан-проект, не аффилированный с командой разработчиков игры.

🔗 **[goblincodex.fun](https://goblincodex.fun)** · **[goblincodex.ru](https://goblincodex.ru)**

## ✨ Что внутри

- **Кодекс** — статьи-гайды и разборы игровых механик (`src/content/guides`, `src/content/mechanics`), с фильтрацией по трейтам
- **Каталог NFT** — Bud'ы и NFT/обычные питомцы с переключателем RU/EN и сравнением до 3 Bud'ов (в т.ч. по прямой ссылке `?compare=id-id`)
- **Новости** — лента из RSS
- **Инструменты** — раздел `/tools` в разработке (заглушка "скоро"); первый калькулятор добычи ресурсов уже доступен по прямой ссылке `/tools/mining-calculator`
- **Профили** — публичные страницы фермеров (`/profile/[username]`)
- **Донаты** — отдельная страница `/donate`

Игровые данные (предметы, баффы, Bud'ы, питомцы) синхронизируются из исходников [sunflower-land](https://github.com/sunflower-land/sunflower-land) скриптами в [scripts/](scripts/README.md) и хранятся в PostgreSQL.

## 🧱 Стек

[Astro](https://astro.build) (SSR, `output: 'server'`) + [React](https://react.dev) для интерактивных островов, PostgreSQL (`pg`), деплой в Docker (`node:22-alpine`, standalone-адаптер).

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
| `npm run sfl:clone` | Скачать исходники Sunflower Land для парсинга данных |
| `npm run sfl:populate` | Распарсить и залить игровые данные в БД |
| `npm run sfl:sync-sprites` | Синхронизировать спрайты в `public/sprites/` |
| `npm run sfl:backup` | Бэкап БД перед обновлением |
| `npm run telegram:backfill` | Догрузить прошлые посты из Telegram |

Подробности по скриптам синхронизации данных — в [scripts/README.md](scripts/README.md).

Для запуска через Docker: `docker compose up -d` (требуются переменные `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`).

## 🗂️ Структура

```text
/
├── src/
│   ├── pages/          # маршруты (Astro), включая API-эндпоинты в pages/api
│   ├── components/     # Astro/React-компоненты
│   ├── content/         # гайды и механики (content collections)
│   ├── layouts/         # общие лэйауты
│   ├── data/, lib/      # данные и утилиты
├── scripts/             # синхронизация игровых данных из SFL в PostgreSQL
├── public/               # статика, спрайты
└── docker-compose.yml, Dockerfile
```

## 🗺️ Роадмап

Актуальный роадмап и статус по кварталам — на странице [/about](https://goblincodex.fun/about) сайта.

Коротко, сейчас (Q3 2026) в работе: страница инструментов и калькулятор ресурсов, авторизация через Telegram, каталог фермеров сообщества, пагинация и Telegram-посты в ленте новостей.

Дальше (Q4 2026): личный кабинет фермера, калькулятор прибыли культур, комментарии под гайдами.

## 🤝 Контрибьютить

Проект открытый — можно предложить гайд, статью или идею. Проще всего написать в Telegram-чат, там же можно задать вопросы по проекту.

## 📬 Контакты

- Telegram-чат: [t.me/URGSFL](https://t.me/URGSFL)
- GitHub: [github.com/Dionis404/goblincodex](https://github.com/Dionis404/goblincodex)
- Поддержать проект: [goblincodex.fun/donate](https://goblincodex.fun/donate)
