#!/usr/bin/env python3
"""Автопостинг новых статей из CMS в Telegram-группу (от имени goblin-bot).

Вызывается из CI после деплоя: получает список .md, ДОБАВЛЕННЫХ в коммите
в src/content/news/, собирает пост из frontmatter и шлёт в Telegram.

Правки существующих статей сюда не попадают (--diff-filter=A в вызывающем
workflow), черновики (draft: true) пропускаются.

Переменные окружения:
  TG_BOT_TOKEN  — токен goblin-bot
  TG_CHAT_ID    — id группы
  DRY_RUN=1     — только напечатать пост, не отправлять
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
    "sunflower": {"emoji": "🌻", "tag": "#sunflowerLand"},
    "yakkamon": {"emoji": "🧚", "tag": "#yakkamon"},
}


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
    description = fm.get("description", "").strip()
    url = f"{SITE}/news/{short_id}"

    lines = [
        f"{meta['emoji']} <b>{html.escape(title)}</b>",
        "",
    ]
    if description:
        lines += [html.escape(description), ""]
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
