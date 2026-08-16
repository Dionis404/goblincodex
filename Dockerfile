
# Шаг 1: Базовый образ — Node 22 на лёгком Alpine Linux
FROM node:22-alpine AS base
WORKDIR /app

# Шаг 2: Устанавливаем зависимости
# Копируем только package.json — если код изменился но зависимости нет,
# Docker использует кэш и не переустанавливает их заново (быстрее билд)
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Шаг 3: Собираем проект
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Шаг 4: Финальный образ — только то что нужно для запуска
# Без исходников и dev-зависимостей — образ лёгкий
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# search-content.ts читает markdown-статьи напрямую с диска (fs.readdirSync)
# для сборки контекста краткого ответа нейропоиска — эти файлы не входят
# в dist (там только скомпилированный вывод), поэтому копируем исходники отдельно
COPY --from=builder /app/src/content ./src/content

# Порт на котором Astro слушает внутри контейнера
EXPOSE 4321

# Запуск сервера
CMD ["node", "./dist/server/entry.mjs"]