export async function notifyAdminTelegram(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ADMIN_TELEGRAM_ID;
  if (!botToken || !chatId) {
    console.error('[telegram-notify] TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID is not set, skipping');
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[telegram-notify] sendMessage failed: ${res.status} ${body}`);
    }
  } catch (e) {
    console.error('[telegram-notify] sendMessage error:', e);
  }
}
