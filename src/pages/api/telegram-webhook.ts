import type { APIRoute } from 'astro';
import { saveTelegramPost } from '../../lib/db';

export const prerender = false;

const TELETYPE_RE = /blog\.goblincodex\.fun|teletype\.in/;
const CHANNEL_USERNAME = 'URGSFL';

interface TelegramMessageEntity {
  type: string;
  url?: string;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  chat?: { username?: string };
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
  link_preview_options?: { url?: string };
  photo?: Array<{ file_id: string }>;
}

function isTeletypeLink(msg: TelegramMessage, text: string): boolean {
  const entities = msg.entities ?? msg.caption_entities ?? [];
  return (
    TELETYPE_RE.test(text) ||
    entities.some(e => e.type === 'text_link' && TELETYPE_RE.test(e.url ?? '')) ||
    TELETYPE_RE.test(msg.link_preview_options?.url ?? '')
  );
}

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(null, { status: 401 });
  }

  const body = await request.json();
  const msg: TelegramMessage | undefined = body.channel_post ?? body.edited_channel_post;

  if (!msg || msg.chat?.username !== CHANNEL_USERNAME) {
    return new Response(null, { status: 200 });
  }

  const text = msg.text ?? msg.caption ?? '';

  if (!text.trim() || isTeletypeLink(msg, text)) {
    return new Response(null, { status: 200 });
  }

  let imageUrl: string | null = null;
  if (msg.photo?.length) {
    try {
      const fileId = msg.photo.at(-1)!.file_id;
      const fileRes = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileData = await fileRes.json();
      if (fileData.ok) {
        imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
      }
    } catch (e) {
      console.error('[telegram-webhook] getFile error:', e);
    }
  }

  try {
    await saveTelegramPost({
      id: msg.message_id,
      date: new Date(msg.date * 1000),
      text,
      imageUrl,
    });
  } catch (e) {
    console.error('[telegram-webhook] saveTelegramPost error:', e);
  }

  return new Response(null, { status: 200 });
};
