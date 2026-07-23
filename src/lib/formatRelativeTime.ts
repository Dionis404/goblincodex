/** Человеко-читаемая метка "обновлено N назад" / "обновлено в HH:MM" (RU). */
export function formatUpdatedAt(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'обновлено только что';
  if (diffMin < 60) return `обновлено ${diffMin} ${pluralMinutes(diffMin)} назад`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `обновлено ${diffHours} ${pluralHours(diffHours)} назад`;

  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return `обновлено вчера в ${time}`;
  if (diffDays < 7) return `обновлено ${diffDays} ${pluralDays(diffDays)} назад`;

  const day = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return `обновлено ${day} в ${time}`;
}

function pluralMinutes(n: number): string {
  return pluralRu(n, 'минуту', 'минуты', 'минут');
}
function pluralHours(n: number): string {
  return pluralRu(n, 'час', 'часа', 'часов');
}
function pluralDays(n: number): string {
  return pluralRu(n, 'день', 'дня', 'дней');
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
