import { RESOURCE_ICONS, COINS_ICON, NODE_ICONS, type ExpansionResource, type NodeKey } from '../lib/expansions';

/** Иконка ресурса — реальный спрайт, скачанный из игры (см. RESOURCE_ICONS). */
export default function ResourceIcon({ resource }: { resource: ExpansionResource }) {
  const icon = RESOURCE_ICONS[resource];
  if (icon.startsWith('/')) {
    return <img src={icon} alt="" className="gc-res-icon" />;
  }
  return (
    <span className="gc-res-icon gc-res-icon--emoji" aria-hidden="true">
      {icon}
    </span>
  );
}

/** Иконка ноды (см. NODE_ICONS) — отдельно от ResourceIcon, т.к. ноды — это NodeKey, не ExpansionResource. */
export function NodeIcon({ node }: { node: NodeKey }) {
  const icon = NODE_ICONS[node];
  if (icon.startsWith('/')) {
    return <img src={icon} alt="" className="gc-res-icon" />;
  }
  return (
    <span className="gc-res-icon gc-res-icon--emoji" aria-hidden="true">
      {icon}
    </span>
  );
}

function formatFlower(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: n < 10 ? 2 : 0 });
}

/** Сумма в Flower с иконкой токена; compact — без жирного шрифта и «≈» (для ячеек таблиц). */
export function FlowerAmount({ value, compact }: { value: number; compact?: boolean }) {
  const icon = <img className="ref-recipe-icon" src="/sprites/icons/flower_token.webp" alt="Flower" />;
  return compact
    ? <span className="ref-flower-compact">{formatFlower(value)} {icon}</span>
    : <strong>≈ {formatFlower(value)} {icon}</strong>;
}

/** Иконка монет (Coins) — отдельно от ExpansionResource, т.к. это не ресурс, а игровая валюта. */
export function CoinsIcon() {
  if (COINS_ICON.startsWith('/')) {
    return <img src={COINS_ICON} alt="" className="gc-res-icon" />;
  }
  return (
    <span className="gc-res-icon gc-res-icon--emoji" aria-hidden="true">
      {COINS_ICON}
    </span>
  );
}
