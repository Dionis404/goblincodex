import { useState, useCallback } from 'react';
import ProfileModal from './ProfileModal.tsx';
import type { GuidesByUser } from './ProfileCard.tsx';

interface Props {
  author?: string;
  contributors?: string[];
  guidesByUser: GuidesByUser;
}

export default function GuideAuthorBlock({ author, contributors, guidesByUser }: Props) {
  const [modalUser, setModalUser] = useState<string | null>(null);
  // undefined = not fetched, null = not found, object = found
  const [farmerCache, setFarmerCache] = useState<Record<string, any>>({});

  const open = useCallback(async (username: string) => {
    const key = username.toLowerCase();
    setModalUser(key);
    if (key in farmerCache) return;
    try {
      const res = await fetch(`/api/profile/${key}.json`);
      const data = res.ok ? await res.json() : null;
      setFarmerCache(prev => ({ ...prev, [key]: data }));
    } catch {
      setFarmerCache(prev => ({ ...prev, [key]: null }));
    }
  }, [farmerCache]);

  const close = useCallback(() => setModalUser(null), []);

  return (
    <>
      {author && (
        <button className="gc-guide-author gc-guide-author--btn" onClick={() => open(author)}>
          <div className="gc-profile-avatar gc-guide-author-avatar-sm" aria-hidden="true">
            <span className="gc-profile-avatar-initial">{author[0].toUpperCase()}</span>
          </div>
          <div>
            <div className="gc-guide-author-name">@{author}</div>
            <div className="gc-guide-author-role">Автор гайда</div>
          </div>
        </button>
      )}

      {contributors && contributors.length > 0 && (
        <div className="gc-guide-contributors">
          <span className="gc-guide-contributors-label">Корректировка:</span>
          {contributors.map((name) => (
            <button
              key={name}
              className="gc-guide-contributor gc-guide-contributor--btn"
              onClick={() => open(name)}
            >
              @{name}
            </button>
          ))}
        </div>
      )}

      {modalUser !== null && (
        <ProfileModal
          username={modalUser}
          farmer={farmerCache[modalUser]}
          guidesByUser={guidesByUser}
          onClose={close}
        />
      )}
    </>
  );
}
