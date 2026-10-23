import type { ReactNode } from 'react';
import './BoostPanel.css';

/**
 * Сворачиваемая панель бустов: общая обёртка для всех панелей с галочками и
 * выпадающими списками бустов. Нативный <details> — работает без JS и с
 * клавиатуры; по умолчанию раскрыта, чтобы действующие бусты были видны.
 */
export default function BoostPanel({
  title = 'Бусты',
  children,
  defaultOpen = true,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="ref-boost-panel" open={defaultOpen}>
      <summary className="ref-boost-panel-summary">{title}</summary>
      {children}
    </details>
  );
}
