#!/usr/bin/env python3
"""Автопостинг новых статей из CMS в Telegram-группу (от имени goblin-bot).

Вызывается из CI после деплоя: получает список .md, ДОБАВЛЕННЫХ в коммите
в src/content/news/, собирает пост из frontmatter и шлёт в Telegram.

Правки существующих статей сюда не попадают (--diff-filter=A в вызывающем
workflow), черновики (draft: true) пропускаются.

Переменные окружения:
  TG_BOT_TOKEN   — токен goblin-bot
  TG_CHAT_ID     — id группы
  LLM_API_KEY    — ключ routerai (если задан, текст поста генерирует LLM;
                   при любой ошибке — фолбэк на шаблон из frontmatter)
  LLM_API_BASE   — default https://routerai.ru/api/v1
  LLM_MODEL      — default google/gemini-2.5-flash
  DRY_RUN=1      — только напечатать пост, не отправлять
"""
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request

NEWS_DIR = "src/content/news/"
SITE = "https://blog.goblincodex.fun"

GAME_META = {
    "sunflower": {"emoji": "🌻", "tag": "#sunflowerLand", "name": "Sunflower Land"},
    "yakkamon": {"emoji": "🧚", "tag": "#yakkamon", "name": "Yakkamon"},
}

LLM_PROMPT = """Ты — Гоблин, автор Telegram-канала Goblin Codex про игры {game}.
Напиши короткий анонс статьи для группы: 2-4 предложения (до 350 символов),
цепляющий первый рядок, суть статьи своими словами, лёгкий призыв читать.
Можно 1-2 эмодзи. Пиши по-русски. Не выдумывай факты, числа и даты —
используй только те, что есть в описании и тексте ниже.
Без заголовка, без ссылок, без хэштегов — только текст анонса.

Заголовок статьи: {title}
Описание: {description}

Начало статьи:
{body}"""


def parse_frontmatter(path: str) -> dict | None:
    """Минимальный разбор frontmatter без PyYAML: ключи верхнего уровня."""
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    data: dict[str, str] = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if not kv:
            continue
        key, val = kv.group(1), kv.group(2).strip()
        if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
            val = val[1:-1]
        data[key] = val
    return data


def article_body(path: str, limit: int = 1500) -> str:
    """Первые ~limit символов текста статьи (после frontmatter), без разметки."""
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n.*?\n---\n", text, re.S)
    body = text[m.end():] if m else text
    body = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)      # картинки
    body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)  # ссылки -> текст
    body = re.sub(r"[#*`>]", "", body)
    return re.sub(r"\n{2,}", "\n", body).strip()[:limit]


def generate_announce(fm: dict, path: str, game_name: str) -> str | None:
    """Текст анонса от LLM (routerai, OpenAI-совместимый API) или None."""
    key = os.environ.get("LLM_API_KEY", "")
    if not key:
        return None
    base = os.environ.get("LLM_API_BASE", "https://routerai.ru/api/v1")
    model = os.environ.get("LLM_MODEL", "google/gemini-2.5-flash")
    prompt = LLM_PROMPT.format(
        game=game_name,
        title=fm.get("title", ""),
        description=fm.get("description", ""),
        body=article_body(path),
    )
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 300,
        "temperature": 0.7,
    }
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read())
        text = data["choices"][0]["message"]["content"].strip()
        return text or None
    except Exception as e:  # любой сбой LLM не должен ломать постинг
        print(f"LLM fallback ({e})", file=sys.stderr)
        return None


def build_message(fm: dict, path: str) -> tuple[str, str | None] | None:
    """(html-текст поста, url картинки|None) или None, если пост не нужен."""
    if fm.get("draft", "false").lower() == "true":
        print(f"skip (draft): {path}")
        return None
    title, short_id = fm.get("title", ""), fm.get("shortId", "")
    if not title or not short_id.isdigit():
        print(f"skip (нет title/shortId): {path}")
        return None

    meta = GAME_META.get(fm.get("game", "sunflower"), GAME_META["sunflower"])
    url = f"{SITE}/news/{short_id}"

    # Текст анонса: LLM, при сбое/отсутствии ключа — description из frontmatter
    announce = generate_announce(fm, path, meta["name"])
    if not announce:
        announce = fm.get("description", "").strip()

    lines = [
        f"{meta['emoji']} <b>{html.escape(title)}</b>",
        "",
    ]
    if announce:
        lines += [html.escape(announce), ""]
    lines.append(f'👉 <a href="{url}">Читать на GoblinCodex</a>')
    lines += ["", meta["tag"]]

    image = fm.get("image", "").strip()
    image_url = f"{SITE}{urllib.parse.quote(image)}" if image.startswith("/") else None
    return "\n".join(lines), image_url


def tg_api(token: str, method: str, payload: dict) -> dict:
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{method}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def main() -> int:
    files = [f for f in sys.argv[1:] if f.startswith(NEWS_DIR) and f.endswith(".md")]
    if not files:
        print("новых статей в коммите нет")
        return 0

    token = os.environ.get("TG_BOT_TOKEN", "")
    chat_id = os.environ.get("TG_CHAT_ID", "")
    dry = os.environ.get("DRY_RUN") == "1"
    if not dry and (not token or not chat_id):
        print("TG_BOT_TOKEN/TG_CHAT_ID не заданы", file=sys.stderr)
        return 1

    for path in files:
        fm = parse_frontmatter(path)
        built = fm and build_message(fm, path)
        if not built:
            continue
        text, image_url = built
        print(f"--- пост для {path} ---\n{text}\nкартинка: {image_url}\n")
        if dry:
            continue
        if image_url:
            payload = {"chat_id": chat_id, "photo": image_url, "caption": text,
                       "parse_mode": "HTML"}
            result = tg_api(token, "sendPhoto", payload)
            if not result.get("ok"):  # картинка могла не подняться — шлём текстом
                print(f"sendPhoto failed: {result}; fallback to sendMessage")
                result = tg_api(token, "sendMessage",
                                {"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        else:
            result = tg_api(token, "sendMessage",
                            {"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        if not result.get("ok"):
            print(f"Telegram error: {result}", file=sys.stderr)
            return 1
        print("отправлено ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
