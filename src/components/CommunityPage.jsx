import ProfileCard from './ProfileCard.tsx';

export default function CommunityPage({ farmers, guidesByUser = {} }) {
  if (!farmers || farmers.length === 0) {
    return (
      <div className="gc-community-empty gc-card">
        <div className="gc-community-empty-icon">🌾</div>
        <p className="gc-community-empty-text">
          Пока никто не привязал ферму. Напиши боту{' '}
          <strong>@SFL_Goblin_Bot</strong>!
        </p>
      </div>
    );
  }

  return (
    <div className="gc-community-grid">
      {farmers.map((farmer) => {
        const username = farmer.game_username ?? `farmer-${farmer.farm_id}`;
        return (
          <ProfileCard
            key={farmer.farm_id}
            username={username}
            farmer={farmer}
            guidesByUser={guidesByUser}
          />
        );
      })}
    </div>
  );
}
