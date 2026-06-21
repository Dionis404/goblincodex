export default function CommunityPage({ farmers }) {
  const fmtXP = (xp) => Math.floor(xp).toLocaleString('ru-RU');
  const fmtCoins = (c) => Math.floor(c).toLocaleString('ru-RU');

  if (!farmers || farmers.length === 0) {
    return (
      <div className="gc-community-empty gc-card">
        <div className="gc-community-empty-icon">🌾</div>
        <p className="gc-community-empty-text">
          Пока никто не привязал ферму. Напиши боту{' '}
          <strong>@GoblinCodexBot</strong>!
        </p>
      </div>
    );
  }

  return (
    <div className="gc-community-grid">
      {farmers.map((farmer) => (
        <div key={farmer.farm_id} className="gc-card gc-card-hover gc-farmer-card">
          <div className="gc-farmer-header">
            <div className="gc-farmer-avatar">🧑‍🌾</div>
            <div className="gc-farmer-name-wrap">
              <div className="gc-farmer-name">
                {farmer.game_username ?? `Фермер #${farmer.farm_id}`}
              </div>
              <span className="gc-verified-badge">✓ Подтверждён</span>
            </div>
          </div>

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

          <a
            href={farmer.farm_url}
            target="_blank"
            rel="noopener noreferrer"
            className="gc-btn-primary gc-farmer-btn"
          >
            🌻 Открыть ферму
          </a>
        </div>
      ))}
    </div>
  );
}
