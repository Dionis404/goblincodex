// Логика переключения светлой/тёмной темы — используется в Header.astro.
// Каждая страница вызывает initThemeToggle() один раз в своём <script> —
// сама функция находит на странице все кнопки-переключатели (полная шапка
// рендерит по одной на десктоп/мобилку) и работает с любым их набором.
export function initThemeToggle(): void {
  const html = document.documentElement;
  const saved = JSON.parse(localStorage.getItem('gcSettings') || '{}');
  let isDark = saved.theme === 'dark';

  const toggles = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');

  const applyTheme = () => {
    html.setAttribute('data-theme', isDark ? 'dark' : '');
    const icon = isDark ? '🌙' : '☀️';
    toggles.forEach(btn => {
      const iconEl = btn.querySelector('[data-theme-icon]');
      if (iconEl) iconEl.textContent = icon;
    });
    localStorage.setItem('gcSettings', JSON.stringify({ ...saved, theme: isDark ? 'dark' : 'light' }));
  };

  applyTheme();

  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      isDark = !isDark;
      applyTheme();
    });
  });
}
