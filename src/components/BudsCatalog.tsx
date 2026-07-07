import { useEffect, useMemo, useRef, useState } from 'react';
import './BudsCatalog.css';

interface BudTrait {
  name: string;
  traitGroup: 'type' | 'stem' | 'aura';
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  labelType: string | null;
  boostType: string | null;
  isDebuff: boolean;
}

interface BudInstance {
  budId: number;
  type: string;
  colour: string;
  stem: string;
  aura: string;
  ears: string;
  imageUrl: string;
}

interface BudFilterOptions {
  types: string[];
  colours: string[];
  stems: string[];
  auras: string[];
  ears: string[];
}

interface Props {
  traits: BudTrait[];
  filterOptions: BudFilterOptions;
}

const GROUP_LABELS: Record<BudTrait['traitGroup'], string> = {
  type: 'Тип острова',
  stem: 'Стебель',
  aura: 'Аура',
};

const MIN_BUD_ID = 1;
const MAX_BUD_ID = 5000;
const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 250;

// Aura buff strength increases Basic → Green → Rare → Mythical (+5%/+20%/+100%/+400%
// per budBuffs.ts) — alphabetical sort would put Mythical before Rare, so order explicitly.
const AURA_ORDER = ['Basic', 'Green', 'Rare', 'Mythical'];

interface Filters {
  budId: string;
  type: string;
  colour: string;
  stem: string;
  aura: string;
  ears: string;
}

const EMPTY_FILTERS: Filters = { budId: '', type: '', colour: '', stem: '', aura: '', ears: '' };

function TraitBadge({ trait }: { trait: BudTrait }) {
  return (
    <span className={`buds-badge buds-badge--${trait.labelType ?? 'success'}`}>
      {trait.descriptionRu || trait.descriptionEn}
    </span>
  );
}

function TraitCard({ trait, selected, onClick }: { trait: BudTrait; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`buds-trait-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="buds-trait-name">{trait.name}</div>
      <TraitBadge trait={trait} />
    </button>
  );
}

function findTrait(traits: BudTrait[], group: BudTrait['traitGroup'], name: string) {
  return traits.find(t => t.traitGroup === group && t.name === name);
}

/** One backdrop tile per "Тип острова" trait — the CDN Bud render has a transparent background. */
function typeBackgroundUrl(type: string): string {
  return `/sprites/buds-backgrounds/${type.toLowerCase()}_shadow.png`;
}

function budMarketplaceUrl(budId: number): string {
  return `https://sunflower-land.com/play/#/world/marketplace/buds/${budId}`;
}

function BudCard({ bud }: { bud: BudInstance }) {
  return (
    <a
      href={budMarketplaceUrl(bud.budId)}
      target="_blank"
      rel="noopener noreferrer"
      className="buds-instance-card"
      title={`Открыть Bud #${bud.budId} на маркетплейсе`}
    >
      <div
        className="buds-instance-image-wrap"
        style={{ backgroundImage: `url(${typeBackgroundUrl(bud.type)})` }}
      >
        <img src={bud.imageUrl} alt={`Bud #${bud.budId}`} className="buds-instance-image" loading="lazy" />
      </div>
      <div className="buds-instance-id">#{bud.budId}</div>
    </a>
  );
}

function BudDetailCard({ bud, traits }: { bud: BudInstance; traits: BudTrait[] }) {
  const resolved = [
    findTrait(traits, 'type', bud.type),
    findTrait(traits, 'stem', bud.stem),
    findTrait(traits, 'aura', bud.aura),
  ].filter((t): t is BudTrait => !!t);

  return (
    <div className="buds-lookup-result">
      <div
        className="buds-lookup-image-wrap"
        style={{ backgroundImage: `url(${typeBackgroundUrl(bud.type)})` }}
      >
        <img
          src={bud.imageUrl}
          alt={`Bud #${bud.budId}`}
          className="buds-lookup-image"
          loading="lazy"
        />
      </div>
      <div className="buds-lookup-info">
        <h3 className="buds-lookup-title">Bud #{bud.budId}</h3>
        <a
          href={budMarketplaceUrl(bud.budId)}
          target="_blank"
          rel="noopener noreferrer"
          className="buds-lookup-market-link"
        >
          Смотреть на маркетплейсе →
        </a>
        <div className="buds-lookup-traits">
          <span className="buds-lookup-trait-line"><strong>Тип:</strong> {bud.type}</span>
          <span className="buds-lookup-trait-line"><strong>Цвет:</strong> {bud.colour}</span>
          <span className="buds-lookup-trait-line"><strong>Стебель:</strong> {bud.stem}</span>
          <span className="buds-lookup-trait-line"><strong>Аура:</strong> {bud.aura}</span>
          <span className="buds-lookup-trait-line"><strong>Уши:</strong> {bud.ears}</span>
        </div>
        <div className="buds-lookup-boosts">
          {resolved.length > 0
            ? resolved.map(t => <TraitBadge key={`${t.traitGroup}-${t.name}`} trait={t} />)
            : <span className="buds-lookup-no-boosts">Нет данных о бонусах</span>
          }
        </div>
      </div>
    </div>
  );
}

export default function BudsCatalog({ traits, filterOptions }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [results, setResults] = useState<BudInstance[] | null>(null);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const hasActiveFilter = Object.values(filters).some(Boolean);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadActiveFilterRef = useRef(false);

  // Результат рендерится ниже карточек трейтов — при первом выборе фильтра
  // подскроллить к нему, иначе легко не заметить, что он появился внизу.
  useEffect(() => {
    if (hasActiveFilter && !hadActiveFilterRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    hadActiveFilterRef.current = hasActiveFilter;
  }, [hasActiveFilter]);

  const grouped = useMemo(() => {
    const groups: Record<BudTrait['traitGroup'], BudTrait[]> = { type: [], stem: [], aura: [] };
    for (const t of traits) groups[t.traitGroup].push(t);
    groups.aura.sort((a, b) => AURA_ORDER.indexOf(a.name) - AURA_ORDER.indexOf(b.name));
    return groups;
  }, [traits]);

  async function runFilterSearch(offset: number, append: boolean, activeFilters: Filters) {
    setFilterStatus('loading');
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value) params.set(key, value);
      }
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/buds/search.json?${params.toString()}`);
      if (!res.ok) throw new Error('search failed');
      const data: { items: BudInstance[]; total: number } = await res.json();

      setResults(prev => append && prev ? [...prev, ...data.items] : data.items);
      setResultsTotal(data.total);
      setFilterStatus('idle');
    } catch {
      setResults(null);
      setResultsTotal(0);
      setFilterStatus('error');
    }
  }

  // Единая точка поиска: любое изменение фильтра (номер Bud, клик по трейту,
  // цвет/уши) обновляет один и тот же блок результатов — без отдельного
  // "поиска по номеру" рядом с "поиском по трейтам".
  useEffect(() => {
    if (!hasActiveFilter) {
      setResults(null);
      setResultsTotal(0);
      setFilterStatus('idle');
      return;
    }
    const timer = setTimeout(() => runFilterSearch(0, false, filters), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function toggleTrait(group: 'type' | 'stem' | 'aura', name: string) {
    setFilters(prev => ({ ...prev, [group]: prev[group] === name ? '' : name }));
  }

  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const budIdInvalid = filters.budId !== '' && (
    !Number.isInteger(Number(filters.budId)) || Number(filters.budId) < MIN_BUD_ID || Number(filters.budId) > MAX_BUD_ID
  );

  return (
    <div className="buds-root">
      <div className="buds-filter-bar">
        <input
          type="number"
          min={MIN_BUD_ID}
          max={MAX_BUD_ID}
          className="buds-filter-id-input"
          placeholder={`Номер Bud (${MIN_BUD_ID}–${MAX_BUD_ID})`}
          value={filters.budId}
          onChange={e => setFilters(prev => ({ ...prev, budId: e.target.value }))}
        />
        <span className="buds-filter-bar-hint">или кликни по карточкам трейтов ниже:</span>
        <select
          className="buds-filter-select"
          value={filters.colour}
          onChange={e => setFilters(prev => ({ ...prev, colour: e.target.value }))}
        >
          <option value="">Цвет: любой</option>
          {filterOptions.colours.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          className="buds-filter-select"
          value={filters.ears}
          onChange={e => setFilters(prev => ({ ...prev, ears: e.target.value }))}
        >
          <option value="">Уши: любые</option>
          {filterOptions.ears.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {hasActiveFilter && (
          <button type="button" className="buds-filter-reset" onClick={handleResetFilters}>
            Сбросить
          </button>
        )}
      </div>

      {hasActiveFilter && (
        <div className="buds-filter-selection">
          {filters.budId && <span className="buds-filter-chip">№ {filters.budId}</span>}
          {filters.type && <span className="buds-filter-chip">Тип: {filters.type}</span>}
          {filters.stem && <span className="buds-filter-chip">Стебель: {filters.stem}</span>}
          {filters.aura && <span className="buds-filter-chip">Аура: {filters.aura}</span>}
          {filters.colour && <span className="buds-filter-chip">Цвет: {filters.colour}</span>}
          {filters.ears && <span className="buds-filter-chip">Уши: {filters.ears}</span>}
        </div>
      )}

      {(Object.keys(GROUP_LABELS) as BudTrait['traitGroup'][]).map(group => (
        <section key={group} className="buds-group">
          <h3 className="buds-group-title">{GROUP_LABELS[group]}</h3>
          <div className="buds-grid">
            {grouped[group].map(t => (
              <TraitCard
                key={t.name}
                trait={t}
                selected={filters[group] === t.name}
                onClick={() => toggleTrait(group, t.name)}
              />
            ))}
          </div>
        </section>
      ))}

      {hasActiveFilter && (
        <section className="buds-results-section" ref={resultsRef}>
          <h3 className="buds-group-title">Результат</h3>

          {budIdInvalid && (
            <div className="buds-lookup-status buds-lookup-status--error">
              Номер Bud должен быть от {MIN_BUD_ID} до {MAX_BUD_ID}.
            </div>
          )}
          {!budIdInvalid && filterStatus === 'loading' && <div className="buds-lookup-status">Ищем подходящие Bud…</div>}
          {!budIdInvalid && filterStatus === 'error' && (
            <div className="buds-lookup-status buds-lookup-status--error">Не удалось выполнить поиск.</div>
          )}

          {!budIdInvalid && filterStatus === 'idle' && results !== null && (
            resultsTotal === 0 ? (
              <div className="buds-lookup-status buds-lookup-status--error">
                Такой комбинации трейтов не существует ни у одного из 5000 Bud.
              </div>
            ) : resultsTotal === 1 ? (
              <BudDetailCard bud={results[0]} traits={traits} />
            ) : (
              <>
                <div className="buds-filter-count">Найдено: <strong>{resultsTotal}</strong> Bud</div>
                <div className="buds-instance-grid">
                  {results.map(b => <BudCard key={b.budId} bud={b} />)}
                </div>
                {results.length < resultsTotal && (
                  <button
                    type="button"
                    className="buds-filter-more"
                    onClick={() => runFilterSearch(results.length, true, filters)}
                  >
                    Показать ещё ({resultsTotal - results.length})
                  </button>
                )}
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}
