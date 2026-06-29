interface Guide {
  id: string;
  title: string;
  icon: string;
}

interface Farmer {
  farm_id: number;
  game_username?: string;
  xp: number;
  balance: number;
  coins: number;
  farm_url: string;
}

export interface GuidesByUser {
  [username: string]: {
    authored: Guide[];
    contributed: Guide[];
  };
}

interface ProfileCardProps {
  /** Canonical username (used for lookup + display when farmer is absent) */
  username: string;
  /** Farmer API data. undefined = loading, null = not found, Farmer = loaded */
  farmer?: Farmer | null;
  guidesByUser: GuidesByUser;
}

export default function ProfileCard({ username, farmer, guidesByUser }: ProfileCardProps) {
  const fmtXP    = (n: number) => Math.floor(n).toLocaleString('ru-RU');
  const fmtCoins = (n: number) => Math.floor(n).toLocaleString('ru-RU');

  const displayName  = farmer?.game_username ?? username;
  const key          = username.toLowerCase();
  const userGuides   = guidesByUser[key] ?? { authored: [], contributed: [] };
  const hasGuides    = userGuides.authored.length > 0 || userGuides.contributed.length > 0;

  // Future: replace with bumpkin avatar renderer based on equipped items
  const initial = displayName[0]?.toUpperCase() ?? '?';

  return (
    <div className="gc-card gc-profile-card">

      {/* ── Header ── */}
      <div className="gc-profile-header">
        <div className="gc-profile-avatar" aria-hidden="true">
          <span className="gc-profile-avatar-initial">{initial}</span>
        </div>
        <div className="gc-farmer-name-wrap">
          <div className="gc-farmer-name">{displayName}</div>
          {farmer && <span className="gc-verified-badge">✓ Подтверждён</span>}
        </div>
      </div>

      {/* ── Farm stats ── */}
      {farmer === undefined ? null : farmer ? (
        <div className="gc-farmer-stats">
          <div className="gc-farmer-stat">
            <div className="gc-farmer-stat-val">{fmtXP(farmer.xp)}</div>
            <div className="gc-farmer-stat-label">XP</div>
          </div>
          <div className="gc-farmer-stat">
            <div className="gc-farmer-stat-val">{farmer.balance.toFixed(2)}</div>
            <div className="gc-farmer-stat-label">FLOWER</div>
          </div>
          <div className="gc-farmer-stat">
            <div className="gc-farmer-stat-val">{fmtCoins(farmer.coins)}</div>
            <div className="gc-farmer-stat-label">Монеты</div>
          </div>
        </div>
      ) : (
        <div className="gc-profile-no-farm">
          🌱 Ферма не привязана —{' '}
          <a href="https://t.me/SFL_Goblin_Bot" target="_blank" rel="noopener noreferrer">
            привязать через бота
          </a>
        </div>
      )}

      {/* ── Guides contribution ── */}
      {hasGuides ? (
        <div className="gc-profile-guides">
          {userGuides.authored.length > 0 && (
            <div className="gc-profile-guides-group">
              <div className="gc-profile-guides-label">
                📖 Автор
                <span className="gc-profile-guides-count">
                  {userGuides.authored.length}
                </span>
              </div>
              <ul className="gc-profile-guides-list">
                {userGuides.authored.map((g) => (
                  <li key={g.id}>
                    <a href={`/codex/${g.id}`} className="gc-profile-guide-link">
                      <span className="gc-profile-guide-icon">{g.icon}</span>
                      {g.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {userGuides.contributed.length > 0 && (
            <div className="gc-profile-guides-group">
              <div className="gc-profile-guides-label">
                ✏️ Вклад в гайды
                <span className="gc-profile-guides-count">
                  {userGuides.contributed.length}
                </span>
              </div>
              <ul className="gc-profile-guides-list">
                {userGuides.contributed.map((g) => (
                  <li key={g.id}>
                    <a href={`/codex/${g.id}`} className="gc-profile-guide-link">
                      <span className="gc-profile-guide-icon">{g.icon}</span>
                      {g.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="gc-profile-guides gc-profile-guides--empty">
          Гайдов пока нет
        </div>
      )}

      {/* ── Community rating — placeholder for future feature ── */}
      <div className="gc-profile-rating">
        <span className="gc-profile-rating-label">⭐ Рейтинг в сообществе</span>
        <span className="gc-profile-rating-soon">скоро</span>
      </div>

      {farmer && (
        <a
          href={farmer.farm_url}
          target="_blank"
          rel="noopener noreferrer"
          className="gc-btn-primary gc-farmer-btn"
        >
          🌻 Открыть ферму
        </a>
      )}
    </div>
  );
}
