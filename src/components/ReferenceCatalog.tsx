import './ReferenceCatalog.css';

/**
 * Static game-constant reference tables (bait guarantees, resource upgrade
 * costs, etc.) — unlike the NFT/Bud/Pet catalogs these never change at
 * runtime, so they're hardcoded here rather than synced from the DB.
 * Source: sunflower-land repo (see scripts/README.md for the clone step),
 * src/features/game/types/fishing.ts (GUARANTEED_CATCH_BY_BAIT) and
 * src/features/game/types/resources.ts (ADVANCED_RESOURCES).
 *
 * To add a new reference table: add a data array + a small render section
 * below, in the same shape as the two existing ones.
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
      <h3 className="ref-section-title">🎣 Гарантированный улов по наживке</h3>
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
      <h3 className="ref-section-title">⛏️ Апгрейд ресурсов через Обсидиан</h3>
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

export default function ReferenceCatalog() {
  return (
    <div className="ref-root">
      <BaitFishSection />
      <ResourceUpgradeSection />
    </div>
  );
}
