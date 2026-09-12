// Логика переключения светлой/тёмной темы — используется в Header.astro.
// Каждая страница вызывает initThemeToggle() один раз в своём <script> —
// сама функция находит на странице все кнопки-переключатели (полная шапка
// рендерит по одной на десктоп/мобилку) и работает с любым их набором.
//
// Тема хранится в cookie (не localStorage) с Domain=.goblincodex.fun/.ru —
// localStorage скоупится per-origin, а SFL/Yakkamon/Новости теперь живут
// на отдельных поддоменах (sfl./yakk./blog.), так что localStorage не
// расшарился бы между ними при переходе.

function rootDomain(): string | null {
  const host = location.hostname;
  const parts = host.split('.');
  if (parts.length < 2) return null; // localhost, IP и т.п. — cookie без Domain (per-host)
  return parts.slice(-2).join('.'); // sfl.goblincodex.fun -> goblincodex.fun
}

function readThemeCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )gc_theme=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function writeThemeCookie(theme: 'dark' | 'light'): void {
  const domain = rootDomain();
  const domainPart = domain ? `; Domain=.${domain}` : '';
  document.cookie = `gc_theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${domainPart}`;
}

export function initThemeToggle(): void {
  const html = document.documentElement;
  let isDark = readThemeCookie() === 'dark';

  const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');

  const applyTheme = () => {
    html.setAttribute('data-theme', isDark ? 'dark' : '');
    const icon = isDark ? '🌙' : '☀️';
    toggles.forEach(btn => {
      const iconEl = btn.querySelector('[data-theme-icon]');
      if (iconEl) iconEl.textContent = icon;
    });
    writeThemeCookie(isDark ? 'dark' : 'light');
  };

  applyTheme();

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      isDark = !isDark;
      applyTheme();
    });
  });
}
