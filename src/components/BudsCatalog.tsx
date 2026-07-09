import { useEffect, useMemo, useRef, useState } from 'react';
import './BudsCatalog.css';
import {
  BUD_BOOST_CATEGORIES,
  computeBudCategoryValue,
  formatBudCategoryValue,
  isBudCategoryActive,
  type BudBoostTraits,
} from '../lib/budBoosts';
import { useBoostLang, pickBoostText, type BoostLang } from '../lib/useBoostLang';

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

function TraitBadge({ trait, lang }: { trait: BudTrait; lang: BoostLang }) {
  return (
    <span className={`buds-badge buds-badge--${trait.labelType ?? 'success'}`}>
      {pickBoostText(lang, trait.descriptionRu, trait.descriptionEn)}
    </span>
  );
}

function TraitCard({ trait, lang, selected, onClick }: {
  trait: BudTrait; lang: BoostLang; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`buds-trait-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="buds-trait-name">{trait.name}</div>
      <TraitBadge trait={trait} lang={lang} />
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
  const lang = useBoostLang();
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
            ? resolved.map(t => <TraitBadge key={`${t.traitGroup}-${t.name}`} trait={t} lang={lang} />)
            : <span className="buds-lookup-no-boosts">Нет данных о бонусах</span>
          }
        </div>
      </div>
    </div>
  );
}

const SLOT_LETTERS = ['A', 'B', 'C'];
const MAX_COMPARE_SLOTS = 3;
const MIN_COMPARE_SLOTS = 2;

interface CompareRow {
  cat: typeof BUD_BOOST_CATEGORIES[number];
  values: number[];
  actives: boolean[];
  winners: number[];
}

function computeCompareRows(buds: BudBoostTraits[]): CompareRow[] {
  return BUD_BOOST_CATEGORIES.map(cat => {
    const values = buds.map(b => computeBudCategoryValue(b, cat));
    const actives = values.map(v => isBudCategoryActive(cat.kind, v));
    const activeValues = values.filter((_, i) => actives[i]);
    let winners: number[] = [];
    if (activeValues.length > 0) {
      const best = cat.kind === 'speed' ? Math.min(...activeValues) : Math.max(...activeValues);
      winners = values.map((v, i) => (actives[i] && v === best ? i : -1)).filter(i => i >= 0);
    }
    return { cat, values, actives, winners };
  }).filter(row => row.actives.some(Boolean)); // скрываем категории, в которых бесполезны оба/все
}

function BudCompareTable({ buds }: { buds: BudInstance[] }) {
  const rows = useMemo(() => computeCompareRows(buds), [buds]);

  const uniqueCounts = buds.map((_, i) =>
    rows.filter(r => r.actives[i] && r.actives.filter(Boolean).length === 1).length,
  );
  const contestedCount = rows.filter(r => r.actives.filter(Boolean).length > 1).length;

  if (rows.length === 0) {
    return (
      <div className="buds-compare-result">
        <p className="buds-compare-verdict">
          Ни у одного из этих Bud нет ни одного применимого бонуса из отслеживаемых категорий.
        </p>
      </div>
    );
  }

  return (
    <div className="buds-compare-result">
      <p className="buds-compare-verdict">
        {buds.map((_, i) => (
          <span key={i}>
            Bud {SLOT_LETTERS[i]} — своя польза в {uniqueCounts[i]}{' '}
            {uniqueCounts[i] === 1 ? 'категории' : 'категориях'}
            {i < buds.length - 1 ? '; ' : '. '}
          </span>
        ))}
        {contestedCount > 0
          ? `Пересекаются в ${contestedCount} ${contestedCount === 1 ? 'категории' : 'категориях'} — там работает бонус только у одного.`
          : 'Ни разу не пересекаются — бонусы работают у всех одновременно.'}
      </p>
      <div className="buds-compare-table-wrap">
        <table className="buds-compare-table">
          <thead>
            <tr>
              <th>Категория</th>
              {buds.map((_, i) => <th key={i}>Bud {SLOT_LETTERS[i]}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.cat.key} className="buds-compare-row">
                <td className="buds-compare-label">{row.cat.label}</td>
                {row.values.map((v, i) => {
                  const active = row.actives[i];
                  const wins = row.winners.includes(i);
                  const tied = wins && row.winners.length > 1;
                  const cellClass = !active
                    ? 'buds-compare-cell--inactive'
                    : tied
                      ? 'buds-compare-cell--tie'
                      : wins
                        ? 'buds-compare-cell--works'
                        : 'buds-compare-cell--beaten';
                  const text = !active
                    ? 'нет бонуса'
                    : tied
                      ? `${formatBudCategoryValue(row.cat.kind, v)} — ничья, сработает только один`
                      : wins
                        ? `${formatBudCategoryValue(row.cat.kind, v)} — работает`
                        : `${formatBudCategoryValue(row.cat.kind, v)} — не сработает`;
                  return <td key={i} className={`buds-compare-value ${cellClass}`}>{text}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="buds-compare-note">
        При ничьей (одинаковое число у нескольких Bud) в игре всё равно сработает только один — какой именно, зависит от порядка Bud в данных игрока и заранее не определяется.
        Основные категории — точный порт формул из getBudYieldBoosts/getBudSpeedBoosts/getBudExperienceBoosts.
        «Доп. шанс поймать рыбу» (Sea/Fish Hat) — расчёт улова идёт на сервере игры, в открытом клиентском коде его нет, поэтому здесь только сам факт «есть/нет бонус» без точного процента; при пересечении между Bud считаем, что срабатывает только один, как и остальные бонусы.
      </p>
    </div>
  );
}

function BudComparator({ traits }: { traits: BudTrait[] }) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>(['', '']);
  const [buds, setBuds] = useState<BudInstance[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  function setIdAt(i: number, value: string) {
    setIds(prev => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function addSlot() {
    if (ids.length < MAX_COMPARE_SLOTS) setIds(prev => [...prev, '']);
  }

  function removeSlot(i: number) {
    if (ids.length > MIN_COMPARE_SLOTS) setIds(prev => prev.filter((_, idx) => idx !== i));
  }

  async function runCompare(parsed: number[]) {
    setStatus('loading');
    try {
      const responses = await Promise.all(parsed.map(id => fetch(`/api/buds/${id}.json`)));
      if (responses.some(r => !r.ok)) throw new Error('not found');
      const data: BudInstance[] = await Promise.all(responses.map(r => r.json()));
      setBuds(data);
      setStatus('idle');

      // Ссылку на конкретное сравнение можно скопировать из адресной строки —
      // тот же приём, что и у гайдов/механик (?tab=mechanics&mech=...).
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'nft');
      url.searchParams.set('nftSub', 'buds');
      url.searchParams.set('compare', parsed.join('-'));
      history.replaceState(null, '', url);
    } catch {
      setBuds(null);
      setStatus('error');
    }
  }

  // При заходе по расшаренной ссылке (?compare=52-60) сразу открыть панель
  // и выполнить то же сравнение.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('compare');
    if (!param) return;
    const parsed = param.split('-').map(v => parseInt(v, 10)).slice(0, MAX_COMPARE_SLOTS);
    const valid = parsed.length >= MIN_COMPARE_SLOTS
      && parsed.every(n => Number.isInteger(n) && n >= MIN_BUD_ID && n <= MAX_BUD_ID);
    if (!valid) return;

    setIds(parsed.map(String));
    setOpen(true);
    runCompare(parsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCompare(e: React.FormEvent) {
    e.preventDefault();
    const filled = ids.map(v => v.trim()).filter(Boolean);
    const parsed = filled.map(v => parseInt(v, 10));
    const valid = parsed.length >= MIN_COMPARE_SLOTS
      && parsed.every(n => Number.isInteger(n) && n >= MIN_BUD_ID && n <= MAX_BUD_ID);

    if (!valid) {
      setStatus('error');
      return;
    }

    await runCompare(parsed);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API can be unavailable (e.g. insecure context) — the URL
      // is still synced in the address bar, so copying manually still works.
    }
  }

  return (
    <section className="buds-compare-section">
      <button type="button" className="buds-compare-toggle" onClick={() => setOpen(o => !o)}>
        ⚖️ Сравнить Bud — работают вместе или мешают друг другу?
      </button>

      {open && (
        <div className="buds-compare-panel">
          <p className="buds-filter-bar-hint">
            В игре бонусы от нескольких Bud не складываются — учитывается только самый сильный по каждому ресурсу.
            Сравни 2–3 Bud по номеру, чтобы увидеть, у кого какой бонус реально сработает.
          </p>
          <form className="buds-compare-form" onSubmit={handleCompare}>
            <div className="buds-compare-slots">
              {ids.map((val, i) => (
                <div className="buds-compare-slot" key={i}>
                  <label className="buds-compare-slot-label">Bud {SLOT_LETTERS[i]}</label>
                  <div className="buds-compare-slot-row">
                    <input
                      type="number"
                      min={MIN_BUD_ID}
                      max={MAX_BUD_ID}
                      className="buds-compare-slot-input"
                      placeholder="Номер"
                      value={val}
                      onChange={e => setIdAt(i, e.target.value)}
                    />
                    {ids.length > MIN_COMPARE_SLOTS && (
                      <button
                        type="button"
                        className="buds-compare-slot-remove"
                        onClick={() => removeSlot(i)}
                        aria-label={`Убрать Bud ${SLOT_LETTERS[i]}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {ids.length < MAX_COMPARE_SLOTS && (
                <button type="button" className="buds-compare-add" onClick={addSlot}>
                  + добавить Bud {SLOT_LETTERS[ids.length]}
                </button>
              )}
            </div>
            <button type="submit" className="buds-compare-submit">Сравнить</button>
          </form>

          {status === 'loading' && <div className="buds-lookup-status">Сравниваем…</div>}
          {status === 'error' && (
            <div className="buds-lookup-status buds-lookup-status--error">
              Не удалось найти все указанные Bud. Проверь номера ({MIN_BUD_ID}–{MAX_BUD_ID}).
            </div>
          )}

          {status === 'idle' && buds && (
            <>
              <button type="button" className="buds-compare-copy-link" onClick={handleCopyLink}>
                {copied ? '✓ Ссылка скопирована' : '🔗 Скопировать ссылку на это сравнение'}
              </button>
              <div className={`buds-compare-heads buds-compare-heads--${buds.length}`}>
                {buds.map((bud, i) => <BudDetailCard key={i} bud={bud} traits={traits} />)}
              </div>
              <BudCompareTable buds={buds} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default function BudsCatalog({ traits, filterOptions }: Props) {
  const lang = useBoostLang();
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

  // Поиск по номеру и поиск по трейтам — два разных режима: у конкретного
  // Bud уже фиксированные трейты, так что комбинировать их с номером не
  // имеет смысла и почти всегда даёт "ничего не найдено". Каждый режим
  // сбрасывает фильтры другого при переключении.
  function handleBudIdChange(value: string) {
    setFilters(value ? { ...EMPTY_FILTERS, budId: value } : EMPTY_FILTERS);
  }

  function toggleTrait(group: 'type' | 'stem' | 'aura', name: string) {
    setFilters(prev => ({ ...prev, budId: '', [group]: prev[group] === name ? '' : name }));
  }

  function setDropdownFilter(key: 'colour' | 'ears', value: string) {
    setFilters(prev => ({ ...prev, budId: '', [key]: value }));
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
          onChange={e => handleBudIdChange(e.target.value)}
        />
        <span className="buds-filter-bar-hint">или кликни по карточкам трейтов ниже:</span>
        <select
          className="buds-filter-select"
          value={filters.colour}
          onChange={e => setDropdownFilter('colour', e.target.value)}
        >
          <option value="">Цвет: любой</option>
          {filterOptions.colours.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select
          className="buds-filter-select"
          value={filters.ears}
          onChange={e => setDropdownFilter('ears', e.target.value)}
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

      <BudComparator traits={traits} />

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
                lang={lang}
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
