import { useState } from 'react';
import './ReferenceCatalog.css';
import {
  stagesForIsland,
  stagesForAscensionLevel,
  sumStages,
  formatResourceList,
  formatDuration,
  ISLAND_GROUP_LABELS,
  type IslandGroup,
  type Stage,
} from '../lib/expansions';

/**
 * Static game-constant reference tables (bait guarantees, resource upgrade
 * costs, etc.) — unlike the NFT/Bud/Pet catalogs these never change at
 * runtime, so they're hardcoded here rather than synced from the DB.
 * Source: sunflower-land repo (see scripts/README.md for the clone step),
 * src/features/game/types/fishing.ts (GUARANTEED_CATCH_BY_BAIT) and
 * src/features/game/types/resources.ts (ADVANCED_RESOURCES).
 *
 * Sections live in a sidebar + content layout (same pattern as the Механики
 * tab). To add a new reference table: add a data array + a small render
 * section below, then register it in REF_SECTIONS at the bottom.
 */

interface BaitFishGroup {
  bait: string;
  tier: string;
  fish: string[];
}

const BAIT_FISH: BaitFishGroup[] = [
  {
    bait: 'Fish Flake',
    tier: 'Обычная рыба',
    fish: [
      'Anchovy', 'Butterflyfish', 'Halibut', 'Blowfish', 'Porgy', 'Clownfish',
      'Sea Bass', 'Sea Horse', 'Muskellunge', 'Horse Mackerel', 'Squid',
      'Moray Eel', 'Olive Flounder', 'Tilapia', 'Napoleanfish', 'Surgeonfish',
      'Zebra Turkeyfish', 'Walleye', 'Angelfish', 'Ray',
    ],
  },
  {
    bait: 'Fish Stick',
    tier: 'Продвинутая рыба',
    fish: [
      'Rock Blackfish', 'Hammerhead shark', 'Tuna', 'Mahi Mahi', 'Blue Marlin',
      'Weakfish', 'Oarfish', 'Football fish', 'Sunfish', 'Cobia',
    ],
  },
  {
    bait: 'Fish Oil',
    tier: 'Редкая рыба',
    fish: ['Barred Knifejaw', 'Trout', 'Coelacanth', 'Saw Shark'],
  },
  {
    bait: 'Crab Stick',
    tier: 'Редкая рыба',
    fish: ['Barred Knifejaw', 'Whale Shark', 'White Shark', 'Parrotfish'],
  },
];

interface ResourceUpgradeRow {
  resource: string;
  tier: 2 | 3;
  requiresName: string;
  requiresAmount: number;
  obsidian: number;
  price: number;
}

const RESOURCE_UPGRADES: ResourceUpgradeRow[] = [
  { resource: 'Ancient Tree',        tier: 2, requiresName: 'Tree',                requiresAmount: 4, obsidian: 3,  price: 25_000 },
  { resource: 'Sacred Tree',         tier: 3, requiresName: 'Ancient Tree',        requiresAmount: 4, obsidian: 5,  price: 50_000 },
  { resource: 'Fused Stone Rock',    tier: 2, requiresName: 'Stone Rock',          requiresAmount: 4, obsidian: 5,  price: 50_000 },
  { resource: 'Reinforced Stone Rock', tier: 3, requiresName: 'Fused Stone Rock',  requiresAmount: 4, obsidian: 10, price: 100_000 },
  { resource: 'Refined Iron Rock',   tier: 2, requiresName: 'Iron Rock',           requiresAmount: 4, obsidian: 10, price: 100_000 },
  { resource: 'Tempered Iron Rock',  tier: 3, requiresName: 'Refined Iron Rock',   requiresAmount: 4, obsidian: 15, price: 200_000 },
  { resource: 'Pure Gold Rock',      tier: 2, requiresName: 'Gold Rock',           requiresAmount: 4, obsidian: 15, price: 200_000 },
  { resource: 'Prime Gold Rock',     tier: 3, requiresName: 'Pure Gold Rock',      requiresAmount: 4, obsidian: 20, price: 350_000 },
];

function BaitFishSection() {
  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Эти наживки не ловят случайную рыбу — они гарантированно приносят одну из рыб своего списка.
      </p>
      <div className="ref-bait-list">
        {BAIT_FISH.map(group => (
          <div className="ref-bait-card" key={group.bait}>
            <div className="ref-bait-header">
              <span className="ref-bait-name">{group.bait}</span>
              <span className="ref-bait-tier">{group.tier}</span>
            </div>
            <div className="ref-bait-fish">
              {group.fish.map(f => <span className="ref-fish-chip" key={f}>{f}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResourceUpgradeSection() {
  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Обсидиан крафтится на Lava Pit. Нужен для улучшения ресурсных нод до следующего тира.
      </p>
      <div className="ref-table-wrap">
        <table className="ref-table">
          <thead>
            <tr>
              <th>Улучшение</th>
              <th>Тир</th>
              <th>Требуется</th>
              <th>Obsidian</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {RESOURCE_UPGRADES.map(row => (
              <tr key={row.resource}>
                <td className="ref-table-name">{row.resource}</td>
                <td>{row.tier}</td>
                <td>{row.requiresAmount}× {row.requiresName}</td>
                <td>{row.obsidian}</td>
                <td>{row.price.toLocaleString('ru-RU')} монет</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StageTable({ stages }: { stages: Stage[] }) {
  const total = sumStages(stages);
  return (
    <div className="ref-table-wrap">
      <table className="ref-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Ресурсы</th>
            <th>Монеты</th>
            <th>Время</th>
            <th>Ур. бампкина</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.id}>
              <td className="ref-table-name">{s.number}</td>
              <td className="ref-table-resources">{formatResourceList(s.cost.resources) || '—'}</td>
              <td>{s.cost.coins.toLocaleString('ru-RU')}</td>
              <td>{formatDuration(s.cost.seconds)}</td>
              <td>{s.cost.level}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="ref-table-name">Итого</td>
            <td className="ref-table-resources">{formatResourceList(total.resources)}</td>
            <td>{total.coins.toLocaleString('ru-RU')}</td>
            <td>{formatDuration(total.seconds)}</td>
            <td>{stages[stages.length - 1]?.cost.level ?? '—'}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

const ISLAND_GROUPS: Exclude<IslandGroup, 'ascension'>[] = ['basic', 'spring', 'desert', 'volcano'];

function IslandAccordion({ group, defaultOpen }: { group: Exclude<IslandGroup, 'ascension'>; defaultOpen?: boolean }) {
  const stages = stagesForIsland(group);
  return (
    <details className="ref-accordion" open={defaultOpen}>
      <summary className="ref-accordion-summary">
        {ISLAND_GROUP_LABELS[group]}
        <span className="ref-accordion-count">{stages.length} расширений</span>
      </summary>
      <div className="ref-accordion-body">
        <StageTable stages={stages} />
      </div>
    </details>
  );
}

function AscensionAccordion() {
  const [level, setLevel] = useState(1);
  const stages = stagesForAscensionLevel(Math.max(1, level));

  return (
    <details className="ref-accordion">
      <summary className="ref-accordion-summary">
        Возвышение (Ascension)
        <span className="ref-accordion-count">12 расширений на уровень</span>
      </summary>
      <div className="ref-accordion-body">
        <p className="ref-section-desc">
          После Вулкана каждое Возвышение полностью сбрасывает ферму и заново отстраивает те же
          12 участков — но дороже (стоимость × 1.3 за каждый следующий уровень).
        </p>
        <label className="ref-level-picker">
          <span>Уровень Возвышения</span>
          <input
            type="number"
            min={1}
            max={50}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          />
        </label>
        <StageTable stages={stages} />
      </div>
    </details>
  );
}

function ExpansionTablesSection() {
  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Стоимость каждого расширения по островам — от Базового до полного Вулкана, и отдельно
        Возвышение.
      </p>
      <div className="ref-accordion-list">
        {ISLAND_GROUPS.map((group, i) => (
          <IslandAccordion key={group} group={group} defaultOpen={i === 0} />
        ))}
        <AscensionAccordion />
      </div>
    </section>
  );
}

interface RefSection {
  id: string;
  icon: string;
  label: string;
  Content: () => JSX.Element;
}

const REF_SECTIONS: RefSection[] = [
  { id: 'expansions', icon: '🌋', label: 'Стоимость расширений', Content: ExpansionTablesSection },
  { id: 'bait', icon: '🎣', label: 'Улов по наживке', Content: BaitFishSection },
  { id: 'upgrades', icon: '⛏️', label: 'Апгрейд ресурсов', Content: ResourceUpgradeSection },
];

export default function ReferenceCatalog() {
  const [activeId, setActiveId] = useState(REF_SECTIONS[0].id);
  const active = REF_SECTIONS.find((s) => s.id === activeId) ?? REF_SECTIONS[0];
  const ActiveContent = active.Content;

  return (
    <div className="ref-layout">
      <aside className="ref-sidebar">
        {REF_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ref-nav-item${s.id === activeId ? ' active' : ''}`}
            onClick={() => setActiveId(s.id)}
          >
            <span className="ref-nav-icon">{s.icon}</span>
            <span className="ref-nav-label">{s.label}</span>
          </button>
        ))}
      </aside>
      <div className="ref-content">
        <ActiveContent />
      </div>
    </div>
  );
}
