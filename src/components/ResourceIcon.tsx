import { RESOURCE_ICONS, COINS_ICON, type ExpansionResource } from '../lib/expansions';

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
