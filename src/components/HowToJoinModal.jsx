import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function HowToJoinModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal-box gc-howto-box" onClick={(e) => e.stopPropagation()}>
        <button className="gc-modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <div className="gc-card gc-howto-card">
          <h2 className="gc-howto-title">🌱 Как добавить свою ферму</h2>
          <ol className="gc-howto-steps">
            <li>
              Открой бота{' '}
              <a href="https://t.me/SFL_Goblin_Bot" target="_blank" rel="noopener noreferrer">
                @SFL_Goblin_Bot
              </a>{' '}
              в Telegram и нажми <strong>Start</strong>.
            </li>
            <li>Следуй подсказкам бота, чтобы привязать свой аккаунт Sunflower Land.</li>
            <li>После подтверждения твоя ферма появится в списке сообщества на этой странице.</li>
          </ol>
          <a
            href="https://t.me/SFL_Goblin_Bot"
            target="_blank"
            rel="noopener noreferrer"
            className="gc-btn-telegram gc-btn-telegram--full"
          >
            Открыть бота
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
