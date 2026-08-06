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
