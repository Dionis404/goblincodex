import { useState } from 'react';
import './ReferenceCatalog.css';
import NumberStepper from './NumberStepper';
import ResourceIcon, { CoinsIcon } from './ResourceIcon';
import {
  stagesForIsland,
  stagesForAscensionLevel,
  sumStages,
  formatDuration,
  ISLAND_GROUP_LABELS,
  RESOURCE_ORDER,
  nodeGainsForStage,
  landImageCountForStage,
  landLevelImageIslandName,
  landLevelImageUrl,
  ascensionIslandName,
  NODE_ORDER,
  NODE_LABELS,
  NODE_ICONS,
  type NodeGain,
  type IslandGroup,
  type Stage,
} from '../lib/expansions';
import {
  LEVEL_XP_ROWS,
  PRE_ASCENSION_MAX_LEVEL,
  LEVELS_PER_ASCENSION,
  ASCENSION_LEVEL_UPS,
  ascensionBandXp,
  ascensionLevelXp,
  ascensionBaseline,
} from '../lib/bumpkinXp';
import {
  SKILLS,
  SKILL_TREE_ORDER,
  SKILL_TREE_LABELS,
  skillsForTree,
  totalPointsForTree,
  pointsSpentByTree,
  totalPointsSpent,
  totalShardsSpent,
  pointsLabel,
  shardsLabel,
  getSkillRankTierRequirement,
  getUnlockedTierForTree,
  maxAchievableRank,
  normalizeRanks,
  costForSkillRank,
  describeSkillRank,
  liveSkillDescription,
  SKILL_TREE_EMOJI,
  type SkillTree,
  type Skill,
} from '../lib/skills';

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

function LevelXpAccordion({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <details className="ref-accordion" open={defaultOpen}>
      <summary className="ref-accordion-summary">
        <span className="ref-accordion-title--center">Опыт по уровням</span>
        <span className="ref-accordion-count">{PRE_ASCENSION_MAX_LEVEL} уровней</span>
      </summary>
      <div className="ref-accordion-body">
        <p className="ref-section-desc">
          Сколько опыта нужно бампкину для каждого уровня — вплоть до {PRE_ASCENSION_MAX_LEVEL}-го,
          потолка перед первым Возвышением.
        </p>
        <div className="ref-table-wrap ref-table-wrap--scroll">
          <table className="ref-table">
            <thead>
              <tr>
                <th>Уровень</th>
                <th>Опыт за уровень</th>
                <th>Всего опыта</th>
              </tr>
            </thead>
            <tbody>
              {LEVEL_XP_ROWS.map((row) => (
                <tr key={row.level}>
                  <td className="ref-table-name">{row.level}</td>
                  <td>{row.level === 1 ? '—' : row.delta.toLocaleString('ru-RU')}</td>
                  <td>{row.total.toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function AscensionXpAccordion() {
  const [ascension, setAscension] = useState(1);
  const a = Math.max(1, ascension || 1);
  const bandTotal = ascensionBandXp(a);
  const baseline = ascensionBaseline(a);

  const rows: { level: number; delta: number; total: number; overall: number }[] = [
    { level: 1, delta: 0, total: 0, overall: baseline },
  ];
  let cumulative = 0;
  for (let n = 1; n <= ASCENSION_LEVEL_UPS; n++) {
    const delta = ascensionLevelXp(a, n);
    cumulative += delta;
    rows.push({ level: n + 1, delta, total: cumulative, overall: baseline + cumulative });
  }

  return (
    <details className="ref-accordion">
      <summary className="ref-accordion-summary">
        <span className="ref-accordion-title--center">Возвышение</span>
        <span className="ref-accordion-count">{LEVELS_PER_ASCENSION} уровней на Возвышение</span>
      </summary>
      <div className="ref-accordion-body">
        <p className="ref-section-desc">
          После {PRE_ASCENSION_MAX_LEVEL}-го уровня каждое Возвышение открывает свою полосу из{' '}
          {LEVELS_PER_ASCENSION} уровней (1–50) с собственной шкалой опыта — она растёт ×1,45 c
          каждым следующим Возвышением.
        </p>
        <label className="ref-level-picker">
          <span>Уровень Возвышения</span>
          <NumberStepper value={ascension} onChange={setAscension} min={1} max={50} />
        </label>
        <p className="ref-section-desc">
          Всего опыта на это Возвышение: <strong>{bandTotal.toLocaleString('ru-RU')}</strong>
        </p>
        <div className="ref-table-wrap ref-table-wrap--scroll">
          <table className="ref-table">
            <thead>
              <tr>
                <th>Уровень Возвышения</th>
                <th>Опыт за уровень</th>
                <th>Всего опыта на этом Возвышении</th>
                <th>Общий опыт</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.level}>
                  <td className="ref-table-name">{row.level}</td>
                  <td>{row.level === 1 ? '—' : Math.round(row.delta).toLocaleString('ru-RU')}</td>
                  <td>{Math.round(row.total).toLocaleString('ru-RU')}</td>
                  <td>{Math.round(row.overall).toLocaleString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function LevelsAndAscensionSection() {
  return (
    <section className="ref-section">
      <a href="/tools/xp-calculator" className="gc-btn-secondary ref-calc-link">
        🧮 Открыть калькулятор опыта
      </a>
      <div className="ref-accordion-list">
        <LevelXpAccordion defaultOpen />
        <AscensionXpAccordion />
      </div>
    </section>
  );
}

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
              <th><ResourceIcon resource="Obsidian" /> Obsidian</th>
              <th><CoinsIcon /> Цена</th>
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

function ResourceChips({ resources }: { resources: Partial<Record<(typeof RESOURCE_ORDER)[number], number>> }) {
  const entries = RESOURCE_ORDER.filter((r) => resources[r]);
  if (entries.length === 0) return <>—</>;
  return (
    <span className="ref-resource-chips">
      {entries.map((r) => (
        <span className="ref-resource-chip" key={r}>
          <ResourceIcon resource={r} />
          {resources[r]!.toLocaleString('ru-RU')}
        </span>
      ))}
    </span>
  );
}

function NodeGainList({ gains }: { gains: NodeGain }) {
  const entries = NODE_ORDER.filter((n) => gains[n]);
  if (entries.length === 0) {
    return <p className="ref-section-desc">Эта покупка не добавляет новых нод на карте.</p>;
  }
  return (
    <div className="ref-node-gains">
      {entries.map((n) => (
        <span className="ref-node-chip" key={n}>
          <img src={NODE_ICONS[n]} alt="" className="gc-res-icon" />
          {NODE_LABELS[n]} +{gains[n]}
        </span>
      ))}
    </div>
  );
}

function StagePreview({ stage, ascensionLevel }: { stage: Stage; ascensionLevel?: number }) {
  const gains = nodeGainsForStage(stage);
  const count = landImageCountForStage(stage);
  const islandName =
    stage.group === 'ascension' ? ascensionIslandName(ascensionLevel ?? 1) : landLevelImageIslandName(stage.group);

  return (
    <div className="ref-stage-preview">
      <div className="ref-stage-preview-image-col">
        <img
          className="gc-island-render"
          src={landLevelImageUrl(islandName, count)}
          alt={`Остров с ${count} расширениями`}
          loading="lazy"
        />
      </div>
      <div className="ref-stage-preview-nodes-col">
        <h4 className="ref-stage-preview-title">Расширение №{stage.number} — новые ноды</h4>
        {gains ? <NodeGainList gains={gains} /> : <p className="ref-section-desc">Нет данных.</p>}
      </div>
    </div>
  );
}

function StageTable({ stages, ascensionLevel }: { stages: Stage[]; ascensionLevel?: number }) {
  const total = sumStages(stages);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedStage = stages.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="ref-table-wrap">
      <table className="ref-table">
        <thead>
          <tr>
            <th>№</th>
            <th>Ресурсы</th>
            <th><CoinsIcon /> Монеты</th>
            <th>Время</th>
            <th>Ур. бампкина</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr
              key={s.id}
              className={`${s.isTransition ? 'ref-table-transition' : 'ref-table-clickable'}${selectedId === s.id ? ' ref-table-row-selected' : ''}`}
              title={s.isTransition ? s.label : 'Показать превью и ноды'}
              onClick={s.isTransition ? undefined : () => setSelectedId(selectedId === s.id ? null : s.id)}
            >
              <td className="ref-table-name">{s.isTransition ? '→' : s.number}</td>
              <td className="ref-table-resources">
                {s.isTransition && <span className="ref-table-transition-label">{s.label}</span>}
                <ResourceChips resources={s.cost.resources} />
              </td>
              <td>{s.cost.coins.toLocaleString('ru-RU')}</td>
              <td>{formatDuration(s.cost.seconds)}</td>
              <td>{s.cost.level}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="ref-table-name">Итого</td>
            <td className="ref-table-resources"><ResourceChips resources={total.resources} /></td>
            <td>{total.coins.toLocaleString('ru-RU')}</td>
            <td>{formatDuration(total.seconds)}</td>
            <td>{stages[stages.length - 1]?.cost.level ?? '—'}</td>
          </tr>
        </tfoot>
      </table>
      {selectedStage && <StagePreview stage={selectedStage} ascensionLevel={ascensionLevel} />}
    </div>
  );
}

const ISLAND_GROUPS: Exclude<IslandGroup, 'ascension'>[] = ['basic', 'spring', 'desert', 'volcano'];

function IslandAccordion({ group, defaultOpen }: { group: Exclude<IslandGroup, 'ascension'>; defaultOpen?: boolean }) {
  const stages = stagesForIsland(group);
  const expansionsCount = stages.filter((s) => !s.isTransition).length;
  return (
    <details className="ref-accordion" open={defaultOpen}>
      <summary className="ref-accordion-summary">
        {ISLAND_GROUP_LABELS[group]}
        <span className="ref-accordion-count">{expansionsCount} расширений + переход</span>
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
        <span className="ref-accordion-count">12 расширений + переход на уровень</span>
      </summary>
      <div className="ref-accordion-body">
        <p className="ref-section-desc">
          После Вулкана каждое Возвышение полностью сбрасывает ферму и заново отстраивает те же
          12 участков — но дороже (стоимость × 1.3 за каждый следующий уровень). В конце таблицы —
          отдельная стоимость перехода на следующее Возвышение (растёт ×1,4 за уровень).
        </p>
        <label className="ref-level-picker">
          <span>Уровень Возвышения</span>
          <NumberStepper value={level} onChange={setLevel} min={1} max={50} />
        </label>
        <StageTable stages={stages} ascensionLevel={Math.max(1, level)} />
      </div>
    </details>
  );
}

function ExpansionTablesSection() {
  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Стоимость каждого расширения по островам — от Базового до полного Вулкана, и отдельно
        Возвышение. В конце каждой таблицы — выделенная строка с ценой самого перехода на
        следующий остров или уровень Возвышения (действие «Апгрейд фермы»), отдельно от стоимости
        расширений.
      </p>
      <a href="/tools/expansion-calculator" className="gc-btn-secondary ref-calc-link">
        🧮 Открыть калькулятор расширений
      </a>
      <div className="ref-accordion-list">
        {ISLAND_GROUPS.map((group, i) => (
          <IslandAccordion key={group} group={group} defaultOpen={i === 0} />
        ))}
        <AscensionAccordion />
      </div>
    </section>
  );
}

function SkillRankBar({ skill, rank, maxRank }: { skill: Skill; rank: number; maxRank: number }) {
  const upgrade = skill.upgrade;
  if (!upgrade) return null;

  const maxLevel = upgrade.maxLevel;
  const canUpgradeFurther = rank < maxLevel;
  // Стоимость ИМЕННО следующего ранга — разница совокупной стоимости, а не
  // фиксированная "цена апгрейда" (getSkillRankUpCost): та годится для ранга
  // 2/3, но для ранга 1 (ещё не изучен) даёт неправильные Осколки Возвышения
  // — базовое изучение стоит только очки, без осколков.
  const nextCost = canUpgradeFurther
    ? (() => {
        const cur = costForSkillRank(skill, rank);
        const next = costForSkillRank(skill, rank + 1);
        return { points: next.points - cur.points, shards: next.shards - cur.shards };
      })()
    : null;
  const nextTierReq = canUpgradeFurther ? getSkillRankTierRequirement(skill.tier, rank) : null;
  const blockedByTier = canUpgradeFurther && rank >= maxRank;

  return (
    <div className="ref-skill-ranks">
      {Array.from({ length: maxLevel }, (_, idx) => {
        const info = describeSkillRank(upgrade.effect, idx as 0 | 1 | 2);
        const rankNum = idx + 1;
        return (
          <span
            key={idx}
            className={`ref-skill-rank${rank >= rankNum ? ' ref-skill-rank--active' : ''}`}
          >
            Ранг {rankNum}: {info.text}
            {info.debuffText ? <span className="ref-skill-rank-debuff"> ({info.debuffText})</span> : ''}
          </span>
        );
      })}
      {nextCost && nextTierReq != null && (
        <span className={`ref-skill-rank-cost${blockedByTier ? ' ref-skill-rank-cost--locked' : ''}`}>
          {blockedByTier ? '🔒 ' : ''}Ранг {rank + 1}: {nextCost.points} {pointsLabel(nextCost.points)}
          {nextCost.shards > 0 && (
            <> + {nextCost.shards} {shardsLabel(nextCost.shards)} Возвышения</>
          )}
          {rank >= 1 && nextTierReq > skill.tier && <> (нужен тир {nextTierReq} ветки)</>}
        </span>
      )}
    </div>
  );
}

function SkillCard({
  skill,
  rank,
  maxRank,
  onRankChange,
}: {
  skill: Skill;
  rank: number;
  maxRank: number;
  onRankChange: (rank: number) => void;
}) {
  const upgrade = skill.upgrade;
  const learned = rank > 0;
  const locked = maxRank <= 0;
  const live = liveSkillDescription(skill, rank);

  return (
    <div className={`ref-skill-card${learned ? ' ref-skill-card--selected' : ''}${locked ? ' ref-skill-card--locked' : ''}`}>
      <div className="ref-skill-card-top">
        <div className={`ref-skill-book ref-skill-book--tier${skill.tier}`}>
          {skill.icon ? (
            <img src={skill.icon} alt="" className="ref-skill-icon-img" />
          ) : (
            <span className="ref-skill-icon-emoji" aria-hidden="true">{SKILL_TREE_EMOJI[skill.tree]}</span>
          )}
        </div>
        <div className="ref-skill-card-header">
          <span className="ref-skill-name">{skill.name}</span>
          <span className={`ref-skill-tier ref-skill-tier--${skill.tier}`}>Тир {skill.tier}</span>
        </div>
      </div>
      <div className="ref-skill-card-body">
        <div className="ref-skill-meta">
          <span className="ref-skill-points">{skill.points} {pointsLabel(skill.points)}</span>
          <span className="ref-skill-island">{ISLAND_GROUP_LABELS[skill.island]}</span>
          {skill.cooldownSeconds != null && (
            <span className="ref-skill-cooldown">Откат {formatDuration(skill.cooldownSeconds)}</span>
          )}
        </div>
        <p className="ref-skill-desc">{live.description}</p>
        {live.debuffDescription && (
          <p className="ref-skill-debuff">{live.debuffDescription}</p>
        )}
        {locked && !learned && (
          <p className="ref-skill-locked-note">🔒 Сначала откройте тир {skill.tier} этого дерева</p>
        )}
        <SkillRankBar skill={skill} rank={rank} maxRank={maxRank} />
        <div className="ref-skill-card-control">
          {upgrade ? (
            <NumberStepper value={rank} onChange={onRankChange} min={0} max={Math.max(rank, maxRank)} />
          ) : (
            <button
              type="button"
              className={`ref-skill-learn-btn${learned ? ' ref-skill-learn-btn--learned' : ''}`}
              disabled={locked && !learned}
              onClick={() => onRankChange(learned ? 0 : 1)}
            >
              {learned ? '✓ Изучено' : 'Изучить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillTreeAccordion({
  tree,
  ranks,
  onRankChange,
  defaultOpen,
}: {
  tree: SkillTree;
  ranks: Record<string, number>;
  onRankChange: (name: string, rank: number) => void;
  defaultOpen?: boolean;
}) {
  const skills = skillsForTree(tree);
  const total = totalPointsForTree(tree);
  const spent = skills.reduce((sum, s) => sum + costForSkillRank(s, ranks[s.name] ?? 0).points, 0);
  const unlockedTier = getUnlockedTierForTree(tree, ranks);

  return (
    <details className="ref-accordion" open={defaultOpen}>
      <summary className="ref-accordion-summary">
        {SKILL_TREE_LABELS[tree]}
        <span className="ref-accordion-count">
          тир {unlockedTier} открыт · {spent}/{total} pts · {skills.length} навыков
        </span>
      </summary>
      <div className="ref-accordion-body">
        <div className="ref-skill-cards">
          {skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              rank={ranks[skill.name] ?? 0}
              maxRank={maxAchievableRank(skill, ranks)}
              onRankChange={(rank) => onRankChange(skill.name, rank)}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function SkillsSection() {
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const spentByTree = pointsSpentByTree(ranks);
  const totalSpent = totalPointsSpent(ranks);
  const totalShards = totalShardsSpent(ranks);

  function setRank(name: string, rank: number) {
    setRanks((prev) => {
      const next = { ...prev };
      if (rank <= 0) delete next[name];
      else next[name] = rank;
      // Снижение/снятие одного навыка может "закрыть" тир дерева, на котором
      // держались другие уже выбранные ранги — подрезаем их до валидного состояния.
      return normalizeRanks(next);
    });
  }

  function reset() {
    setRanks({});
  }

  return (
    <section className="ref-section">
      <p className="ref-section-desc">
        Полное дерево навыков бампкина — {SKILLS.length} навыков в {SKILL_TREE_ORDER.length} ветках.
        Часть навыков после изучения можно ещё прокачать до ранга 2 и 3 за очки навыков и Осколки
        Возвышения — жмите +/- на карточке. Ниже сразу видно, сколько очков и осколков потребует ваша
        сборка, по каждой ветке отдельно и в сумме.
      </p>
      <div className="ref-skills-beta-note">
        ⚠️ Бонусы от прокачанных рангов навыков (2 и 3) сейчас в бета-тестировании и
        после релиза могут измениться.
      </div>
      <div className="ref-skills-summary">
        <div className="ref-skills-summary-total">
          <span>Выбрано очков навыков</span>
          <strong>{totalSpent}</strong>
          {totalShards > 0 && (
            <span className="ref-skills-summary-shards">
              {totalShards} {shardsLabel(totalShards)} Возвышения
            </span>
          )}
          {(totalSpent > 0 || totalShards > 0) && (
            <button type="button" className="ref-skills-reset" onClick={reset}>
              Сбросить
            </button>
          )}
        </div>
        <div className="ref-skills-summary-trees">
          {SKILL_TREE_ORDER.map((tree) => {
            const total = totalPointsForTree(tree);
            const spent = spentByTree[tree];
            return (
              <span
                key={tree}
                className={`ref-skills-summary-chip${spent > 0 ? ' ref-skills-summary-chip--active' : ''}`}
              >
                {SKILL_TREE_LABELS[tree]}: {spent}/{total}
              </span>
            );
          })}
        </div>
      </div>
      <div className="ref-accordion-list">
        {SKILL_TREE_ORDER.map((tree, i) => (
          <SkillTreeAccordion
            key={tree}
            tree={tree}
            ranks={ranks}
            onRankChange={setRank}
            defaultOpen={i === 0}
          />
        ))}
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
  { id: 'skills', icon: '🎓', label: 'Навыки', Content: SkillsSection },
  { id: 'expansions', icon: '🌋', label: 'Стоимость расширений', Content: ExpansionTablesSection },
  { id: 'levels', icon: '⭐', label: 'Опыт и Возвышение', Content: LevelsAndAscensionSection },
  { id: 'bait', icon: '🎣', label: 'Улов по наживке', Content: BaitFishSection },
  { id: 'upgrades', icon: '⛏️', label: 'Апгрейд ресурсов', Content: ResourceUpgradeSection },
  
];

function getInitialId(): string {
  if (typeof window === 'undefined') return REF_SECTIONS[0].id;
  const ref = new URLSearchParams(window.location.search).get('ref');
  return REF_SECTIONS.some((s) => s.id === ref) ? ref! : REF_SECTIONS[0].id;
}

export default function ReferenceCatalog() {
  const [activeId, setActiveId] = useState(getInitialId);
  const active = REF_SECTIONS.find((s) => s.id === activeId) ?? REF_SECTIONS[0];
  const ActiveContent = active.Content;

  function selectSection(id: string) {
    setActiveId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'reference');
    url.searchParams.set('ref', id);
    history.replaceState(null, '', url);
  }

  return (
    <div className="ref-layout">
      <aside className="ref-sidebar">
        {REF_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`/codex?tab=reference&ref=${s.id}`}
            className={`ref-nav-item${s.id === activeId ? ' active' : ''}`}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              selectSection(s.id);
            }}
          >
            <span className="ref-nav-icon">{s.icon}</span>
            <span className="ref-nav-label">{s.label}</span>
          </a>
        ))}
      </aside>
      <div className="ref-content">
        <ActiveContent />
      </div>
    </div>
  );
}
