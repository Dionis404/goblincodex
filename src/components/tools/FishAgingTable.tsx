import { useMemo, useState } from 'react';
import '../SortableTable.css';

/**
 * Данные и формулы сверены с features/game/types/agingBase.ts (getAgingMaxXP /
 * getAgingSaltCost / getAgingTimeMs) и features/game/types/consumables.ts (FISH)
 * из исходников sunflower-land — см. src/content/mechanics/fish-aging.md.
 */
const FISH_BASE_XP: Record<string, number> = {
  Anchovy: 80, 'Red Snapper': 100, Butterflyfish: 110, 'Sea Bass': 140, Blowfish: 170,
  'Olive Flounder': 180, Napoleanfish: 180, Tilapia: 190, Tuna: 200, 'Mahi Mahi': 200,
  'Blue Marlin': 200, 'Football fish': 200, Sunfish: 200, 'Sea Horse': 240, Halibut: 220,
  'Moray Eel': 220, 'Zebra Turkeyfish': 220, Oarfish: 220, Clownfish: 210, Surgeonfish: 210,
  Walleye: 210, Weakfish: 210, 'Horse Mackerel': 250, Squid: 250, Angelfish: 250, Porgy: 250,
  Muskellunge: 250, Cobia: 310, 'Rock Blackfish': 320, Trout: 330, Coelacanth: 410, Ray: 430,
  Parrotfish: 440, 'Barred Knifejaw': 580, 'Hammerhead shark': 750, 'Whale Shark': 1370,
  'Saw Shark': 1920, 'White Shark': 2000,
};

function getAgingMaxXP(baseXP: number): number {
  if (baseXP <= 200) return baseXP * 3;
  if (baseXP <= 330) return baseXP * 4;
  return baseXP * 5;
}
function getAgingSaltCost(baseXP: number): number {
  return Math.round(getAgingMaxXP(baseXP) / 50);
}
function getAgingTimeHours(baseXP: number): number {
  const maxXP = getAgingMaxXP(baseXP);
  const j = baseXP <= 200 ? 300 : baseXP <= 330 ? 500 : 1000;
  return (maxXP - baseXP) / j;
}
function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} мин`;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins > 0 ? `${whole} ч ${mins} мин` : `${whole} ч`;
}

interface Row {
  name: string;
  baseXP: number;
  maxXP: number;
  saltCost: number;
  timeHours: number;
  xpPerSalt: number;
  xpPerHour: number;
}

const ROWS: Row[] = Object.entries(FISH_BASE_XP).map(([name, baseXP]) => {
  const maxXP = getAgingMaxXP(baseXP);
  const saltCost = getAgingSaltCost(baseXP);
  const timeHours = getAgingTimeHours(baseXP);
  const xpGained = maxXP - baseXP;
  return {
    name,
    baseXP,
    maxXP,
    saltCost,
    timeHours,
    xpPerSalt: Math.round((xpGained / saltCost) * 100) / 100,
    xpPerHour: Math.round(xpGained / timeHours),
  };
});

type SortKey = 'name' | 'baseXP' | 'maxXP' | 'saltCost' | 'timeHours' | 'xpPerSalt' | 'xpPerHour';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Рыба' },
  { key: 'baseXP', label: 'Базовый XP' },
  { key: 'maxXP', label: 'XP после соления' },
  { key: 'saltCost', label: 'Соль' },
  { key: 'timeHours', label: 'Время' },
  { key: 'xpPerSalt', label: 'XP за 1 соль' },
  { key: 'xpPerHour', label: 'XP/час' },
];

export default function FishAgingTable() {
  const [sortKey, setSortKey] = useState<SortKey>('baseXP');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortedRows = useMemo(() => {
    const rows = [...ROWS];
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [sortKey, sortDir]);

  return (
    <div className="gc-sortable-wrap">
      <table className="gc-sortable-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key}>
                <button type="button" className="gc-sortable-th-btn" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <span className={`gc-sortable-arrow${sortKey === col.key ? ' gc-sortable-arrow--active' : ''}`}>
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.name}>
              <td className="gc-sortable-name">{r.name}</td>
              <td>{r.baseXP}</td>
              <td>{r.maxXP}</td>
              <td>{r.saltCost}</td>
              <td>{formatHours(r.timeHours)}</td>
              <td>{r.xpPerSalt}</td>
              <td>{r.xpPerHour}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
