import { useState, useEffect } from 'react';

// Дата окончания сезона — меняй здесь
const SEASON_END = new Date('2026-08-03T00:00:00Z');

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function ChapterTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = SEASON_END.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days    = Math.floor(diff / 86400000);
      const hours   = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="gc-timer-row">
      <span className="gc-timer-label">до конца сезона</span>
      <div className="gc-timer-digits">
        <span className="gc-timer-value">{timeLeft.days}д</span>
        <span className="gc-timer-sep"> </span>
        <span className="gc-timer-value">{pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}</span>
      </div>
    </div>
  );
}