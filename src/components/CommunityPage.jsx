import { useState } from 'react';
import ProfileModal from './ProfileModal.tsx';

export default function CommunityPage({ farmers, guidesByUser = {} }) {
  const [modalUser, setModalUser] = useState(null);

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

  const selectedFarmer = modalUser
    ? (farmers.find(f => (f.game_username ?? '').toLowerCase() === modalUser) ?? null)
    : null;

  return (
    <>
      <div className="gc-community-grid">
        {farmers.map((farmer) => {
          const username = farmer.game_username ?? `Фермер #${farmer.farm_id}`;
          const initial  = username[0].toUpperCase();
          const xp       = Math.floor(farmer.xp).toLocaleString('ru-RU');

          return (
            <button
              key={farmer.farm_id}
              className="gc-card gc-card-hover gc-farmer-tile"
              onClick={() => setModalUser((farmer.game_username ?? '').toLowerCase())}
            >
              <div className="gc-profile-avatar gc-farmer-tile-avatar" aria-hidden="true">
                <span className="gc-profile-avatar-initial">{initial}</span>
              </div>
              <div className="gc-farmer-tile-info">
                <div className="gc-farmer-name">{username}</div>
                <span className="gc-verified-badge">✓ Подтверждён</span>
              </div>
              <div className="gc-farmer-tile-xp">
                {xp}
                <span>XP</span>
              </div>
            </button>
          );
        })}
      </div>

      {modalUser !== null && (
        <ProfileModal
          username={modalUser}
          farmer={selectedFarmer}
          guidesByUser={guidesByUser}
          onClose={() => setModalUser(null)}
        />
      )}
    </>
  );
}
