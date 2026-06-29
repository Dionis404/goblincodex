import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import ProfileCard, { type GuidesByUser } from './ProfileCard.tsx';

interface Farmer {
  farm_id: number;
  game_username?: string;
  xp: number;
  balance: number;
  coins: number;
  farm_url: string;
}

interface ProfileModalProps {
  username: string;
  /** undefined = still loading, null = not found, Farmer = loaded */
  farmer: Farmer | null | undefined;
  guidesByUser: GuidesByUser;
  onClose: () => void;
}

export default function ProfileModal({ username, farmer, guidesByUser, onClose }: ProfileModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Portal ensures the modal renders in document.body regardless of where
  // the parent component sits in the DOM tree (fixes fixed-position stacking issues)
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="gc-modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <ProfileCard username={username} farmer={farmer} guidesByUser={guidesByUser} />
      </div>
    </div>,
    document.body
  );
}
