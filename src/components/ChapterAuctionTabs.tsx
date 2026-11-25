import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import ChapterAuctions from './ChapterAuctions';
import AuctionTiers from './AuctionTiers';
import './ChapterAuctionTabs.css';

type Tab = 'schedule' | 'history' | 'tiers';

const TABS: { id: Tab; label: string }[] = [
  { id: 'schedule', label: '📅 Расписание' },
  { id: 'history', label: '🕘 История' },
  { id: 'tiers', label: '📊 Тиры' },
];

const VALID = new Set<Tab>(TABS.map((t) => t.id));

/**
 * Центр аукционов главы: расписание, история и тиры — три вкладки в одном
 * блоке. Каждая вкладка тянет свои данные клиентом только при открытии
 * (ChapterAuctions самозагружается, AuctionTiers тоже), поэтому неактивные
 * вкладки ничего не весят и не грузят API. Выбранная вкладка отражается в
 * query-параметре ?auktab= — можно дать прямую ссылку на историю или тиры.
 */
export default function ChapterAuctionTabs({ chapterName }: { chapterName: string }) {
  const [tab, setTab] = useState<Tab>('schedule');
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  // SSR и первый рендер всегда показывают расписание; параметр из URL
  // применяем после монтирования — иначе будет hydration mismatch.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('auktab');
    if (fromUrl && VALID.has(fromUrl as Tab) && fromUrl !== 'schedule') {
      setTab(fromUrl as Tab);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (tab === 'schedule') params.delete('auktab');
    else params.set('auktab', tab);
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [tab]);

  useLayoutEffect(() => {
    const container = tabsRef.current;
    const active = tabRefs.current[tab];
    if (!container || !active) return;
    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      setIndicatorStyle({ left: activeRect.left - containerRect.left, width: activeRect.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [tab]);

  return (
    <div className="cat-root">
      <div className="cat-tabs" ref={tabsRef}>
        <div
          className="cat-tab-indicator"
          style={{ transform: `translateX(${indicatorStyle.left}px)`, width: `${indicatorStyle.width}px` }}
        />
        {TABS.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            type="button"
            className={`cat-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <ChapterAuctions chapterName={chapterName} maxInitialGroups={3} />
      )}
      {tab === 'history' && (
        <ChapterAuctions
          dataUrl="/api/auctions/history.json"
          defaultStatusFilter="ended"
          showStatusFilter={false}
          maxInitialGroups={5}
        />
      )}
      {tab === 'tiers' && <AuctionTiers />}
    </div>
  );
}
