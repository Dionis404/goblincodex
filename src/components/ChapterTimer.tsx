import { useState, useEffect } from 'react';
import { getCurrentChapter } from '../lib/chapters';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function ChapterTimer() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Конец главы берём из src/lib/chapters.ts на каждом тике — при переходе
    // через границу таймер сам переключается на следующую главу.
    const tick = () => {
      const chapter = getCurrentChapter();
      const diff = chapter ? new Date(chapter.endDate).getTime() - Date.now() : 0;
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