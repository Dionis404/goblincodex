import { useEffect, useMemo, useRef, useState } from 'react';
import './PetsCatalog.css';

interface PetCommon {
  name: string;
  breed: string;
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
}

interface PetNftBreed {
  name: string;
  sprite: string | null;
  sampleImageUrl: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
}

interface PetNftTrait {
  name: string;
  traitGroup: 'aura' | 'bib';
  sprite: string | null;
  descriptionEn: string | null;
  descriptionRu: string | null;
  labelType: string | null;
  boostType: string | null;
  isDebuff: boolean;
}

interface PetFetch {
  petType: string;
  isNft: boolean;
  resourceName: string;
  unlockLevel: number;
}

interface PetResource {
  resourceName: string;
  energyYield: number | null;
}

interface PetNftInstance {
  petId: number;
  type: string;
  fur: string;
  accessory: string;
  bib: string;
  aura: string;
  imageUrl: string;
}

interface PetNftFilterOptions {
  types: string[];
  furs: string[];
  accessories: string[];
  bibs: string[];
  auras: string[];
}

interface Props {
  commonPets: PetCommon[];
  nftBreeds: PetNftBreed[];
  nftTraits: PetNftTrait[];
  nftFilterOptions: PetNftFilterOptions;
  fetches: PetFetch[];
  resources: PetResource[];
}

const MIN_PET_NFT_ID = 1;
const MAX_PET_NFT_ID = 3000;
const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 250;

interface Filters {
  petId: string;
  type: string;
  fur: string;
  accessory: string;
  bib: string;
  aura: string;
}

const EMPTY_FILTERS: Filters = { petId: '', type: '', fur: '', accessory: '', bib: '', aura: '' };

function petNftMarketplaceUrl(petId: number): string {
  return `https://sunflower-land.com/play/#/marketplace/pets/${petId}`;
}

function SpriteImg({ sprite, name, size = 64 }: { sprite: string | null; name: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!sprite || error) {
    return (
      <div className="pc-sprite-placeholder" style={{ width: size, height: size }}>
        <span>?</span>
      </div>
    );
  }
  return (
    <img
      src={`/sprites/${sprite}`}
      alt={name}
      width={size}
      height={size}
      loading="lazy"
      className="pc-sprite-img"
      onError={() => setError(true)}
    />
  );
}

function RemoteImg({ src, alt, size = 64 }: { src: string | null; alt: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="pc-sprite-placeholder" style={{ width: size, height: size }}>
        <span>?</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className="pc-sprite-img"
      onError={() => setError(true)}
    />
  );
}

function TraitBadge({ trait }: { trait: PetNftTrait }) {
  return (
    <span className={`pc-badge pc-badge--${trait.labelType ?? 'success'}`}>
      {trait.descriptionRu || trait.descriptionEn}
    </span>
  );
}

function findTrait(traits: PetNftTrait[], group: PetNftTrait['traitGroup'], name: string) {
  return traits.find(t => t.traitGroup === group && t.name === name);
}

function FetchLadder({ breed, fetches, resources, isNft }: {
  breed: string;
  fetches: PetFetch[];
  resources: PetResource[];
  isNft: boolean;
}) {
  const rows = fetches
    .filter(f => f.isNft === isNft && f.petType === breed)
    .sort((a, b) => a.unlockLevel - b.unlockLevel);

  if (rows.length === 0) return null;

  return (
    <ul className="pc-fetch-list">
      {rows.map(f => {
        const energy = resources.find(r => r.resourceName === f.resourceName)?.energyYield;
        return (
          <li key={f.unlockLevel} className="pc-fetch-row">
            <span className="pc-fetch-level">Ур. {f.unlockLevel}</span>
            <span className="pc-fetch-resource">{f.resourceName}</span>
            {energy != null && <span className="pc-fetch-energy">+{energy} энергии</span>}
          </li>
        );
      })}
    </ul>
  );
}

function CommonPetCard({ pet, fetches, resources }: { pet: PetCommon; fetches: PetFetch[]; resources: PetResource[] }) {
  return (
    <div className="pc-card">
      <div className="pc-card-sprite">
        <SpriteImg sprite={pet.sprite} name={pet.name} size={80} />
      </div>
      <div className="pc-card-name">{pet.name}</div>
      <span className="pc-breed-badge">{pet.breed}</span>
      {pet.descriptionRu && <div className="pc-card-desc">{pet.descriptionRu}</div>}
      <FetchLadder breed={pet.breed} fetches={fetches} resources={resources} isNft={false} />
    </div>
  );
}

function NftBreedCard({ breed, fetches, resources, selected, onClick }: {
  breed: PetNftBreed;
  fetches: PetFetch[];
  resources: PetResource[];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`pc-card pc-card--breed${selected ? ' selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="pc-card-sprite">
        <RemoteImg src={breed.sampleImageUrl} alt={breed.name} size={120} />
      </div>
      <div className="pc-card-name">{breed.name}</div>
      {breed.descriptionRu && <div className="pc-card-desc">{breed.descriptionRu}</div>}
      <FetchLadder breed={breed.name} fetches={fetches} resources={resources} isNft />
    </button>
  );
}

function NftInstanceCard({ pet }: { pet: PetNftInstance }) {
  return (
    <a
      href={petNftMarketplaceUrl(pet.petId)}
      target="_blank"
      rel="noopener noreferrer"
      className="pc-instance-card"
      title={`Открыть Pet #${pet.petId} на маркетплейсе`}
    >
      <img src={pet.imageUrl} alt={`Pet #${pet.petId}`} className="pc-instance-image" loading="lazy" />
      <div className="pc-instance-id">#{pet.petId}</div>
    </a>
  );
}

function NftDetailCard({ pet, traits }: { pet: PetNftInstance; traits: PetNftTrait[] }) {
  const resolved = [
    findTrait(traits, 'aura', pet.aura),
    findTrait(traits, 'bib', pet.bib),
  ].filter((t): t is PetNftTrait => !!t);

  return (
    <div className="pc-lookup-result">
      <img src={pet.imageUrl} alt={`Pet #${pet.petId}`} className="pc-lookup-image" loading="lazy" />
      <div className="pc-lookup-info">
        <h3 className="pc-lookup-title">Pet #{pet.petId} · {pet.type}</h3>
        <a
          href={petNftMarketplaceUrl(pet.petId)}
          target="_blank"
          rel="noopener noreferrer"
          className="pc-lookup-market-link"
        >
          Смотреть на маркетплейсе →
        </a>
        <div className="pc-lookup-traits">
          <span className="pc-lookup-trait-line"><strong>Окрас:</strong> {pet.fur}</span>
          <span className="pc-lookup-trait-line"><strong>Аксессуар:</strong> {pet.accessory}</span>
          <span className="pc-lookup-trait-line"><strong>Ошейник:</strong> {pet.bib}</span>
          <span className="pc-lookup-trait-line"><strong>Аура:</strong> {pet.aura}</span>
        </div>
        <div className="pc-lookup-boosts">
          {resolved.length > 0
            ? resolved.map(t => <TraitBadge key={`${t.traitGroup}-${t.name}`} trait={t} />)
            : <span className="pc-lookup-no-boosts">Нет данных о бонусах</span>
          }
        </div>
      </div>
    </div>
  );
}

export default function PetsCatalog({ commonPets, nftBreeds, nftTraits, nftFilterOptions, fetches, resources }: Props) {
  const [tab, setTab] = useState<'common' | 'nft'>('common');

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [results, setResults] = useState<PetNftInstance[] | null>(null);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const hasActiveFilter = Object.values(filters).some(Boolean);
  const resultsRef = useRef<HTMLDivElement>(null);
  const hadActiveFilterRef = useRef(false);

  // Результат рендерится ниже пород/трейтов — при первом выборе фильтра
  // подскроллить к нему, иначе легко не заметить, что он появился внизу.
  useEffect(() => {
    if (hasActiveFilter && !hadActiveFilterRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
    hadActiveFilterRef.current = hasActiveFilter;
  }, [hasActiveFilter]);

  const traitGroups = useMemo(() => ({
    aura: nftTraits.filter(t => t.traitGroup === 'aura'),
    bib: nftTraits.filter(t => t.traitGroup === 'bib'),
  }), [nftTraits]);

  async function runFilterSearch(offset: number, append: boolean, activeFilters: Filters) {
    setFilterStatus('loading');
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value) params.set(key, value);
      }
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));

      const res = await fetch(`/api/pets/nft/search.json?${params.toString()}`);
      if (!res.ok) throw new Error('search failed');
      const data: { items: PetNftInstance[]; total: number } = await res.json();

      setResults(prev => append && prev ? [...prev, ...data.items] : data.items);
      setResultsTotal(data.total);
      setFilterStatus('idle');
    } catch {
      setResults(null);
      setResultsTotal(0);
      setFilterStatus('error');
    }
  }

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

  function toggleTrait(key: 'type' | 'aura' | 'bib', name: string) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === name ? '' : name }));
  }

  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const petIdInvalid = filters.petId !== '' && (
    !Number.isInteger(Number(filters.petId)) || Number(filters.petId) < MIN_PET_NFT_ID || Number(filters.petId) > MAX_PET_NFT_ID
  );

  return (
    <div className="pc-root">
      <div className="pc-tabs">
        <button
          type="button"
          className={`pc-tab${tab === 'common' ? ' active' : ''}`}
          onClick={() => setTab('common')}
        >
          Обычные <span className="pc-tab-count">{commonPets.length}</span>
        </button>
        <button
          type="button"
          className={`pc-tab${tab === 'nft' ? ' active' : ''}`}
          onClick={() => setTab('nft')}
        >
          NFT <span className="pc-tab-count">{nftBreeds.length} пород</span>
        </button>
      </div>

      {tab === 'common' && (
        <div className="pc-grid">
          {commonPets.map(p => <CommonPetCard key={p.name} pet={p} fetches={fetches} resources={resources} />)}
        </div>
      )}

      {tab === 'nft' && (
        <>
          <div className="pc-filter-bar">
            <input
              type="number"
              min={MIN_PET_NFT_ID}
              max={MAX_PET_NFT_ID}
              className="pc-filter-id-input"
              placeholder={`Номер Pet (${MIN_PET_NFT_ID}–${MAX_PET_NFT_ID})`}
              value={filters.petId}
              onChange={e => setFilters(prev => ({ ...prev, petId: e.target.value }))}
            />
            <span className="pc-filter-bar-hint">или кликни по породе/трейтам ниже:</span>
            <select
              className="pc-filter-select"
              value={filters.fur}
              onChange={e => setFilters(prev => ({ ...prev, fur: e.target.value }))}
            >
              <option value="">Окрас: любой</option>
              {nftFilterOptions.furs.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select
              className="pc-filter-select"
              value={filters.accessory}
              onChange={e => setFilters(prev => ({ ...prev, accessory: e.target.value }))}
            >
              <option value="">Аксессуар: любой</option>
              {nftFilterOptions.accessories.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {hasActiveFilter && (
              <button type="button" className="pc-filter-reset" onClick={handleResetFilters}>
                Сбросить
              </button>
            )}
          </div>

          {hasActiveFilter && (
            <div className="pc-filter-selection">
              {filters.petId && <span className="pc-filter-chip">№ {filters.petId}</span>}
              {filters.type && <span className="pc-filter-chip">Порода: {filters.type}</span>}
              {filters.aura && <span className="pc-filter-chip">Аура: {filters.aura}</span>}
              {filters.bib && <span className="pc-filter-chip">Ошейник: {filters.bib}</span>}
              {filters.fur && <span className="pc-filter-chip">Окрас: {filters.fur}</span>}
              {filters.accessory && <span className="pc-filter-chip">Аксессуар: {filters.accessory}</span>}
            </div>
          )}

          <h3 className="pc-section-title">Породы</h3>
          <div className="pc-grid">
            {nftBreeds.map(b => (
              <NftBreedCard
                key={b.name}
                breed={b}
                fetches={fetches}
                resources={resources}
                selected={filters.type === b.name}
                onClick={() => toggleTrait('type', b.name)}
              />
            ))}
          </div>

          <section className="pc-traits-section">
            <h3 className="pc-section-title">Ауры</h3>
            <div className="pc-traits-row">
              {traitGroups.aura.map(t => (
                <button
                  type="button"
                  key={t.name}
                  className={`pc-trait-card${filters.aura === t.name ? ' selected' : ''}`}
                  onClick={() => toggleTrait('aura', t.name)}
                  aria-pressed={filters.aura === t.name}
                >
                  <div className="pc-trait-name">{t.name}</div>
                  <TraitBadge trait={t} />
                </button>
              ))}
            </div>
            <h3 className="pc-section-title">Ошейники</h3>
            <div className="pc-traits-row">
              {traitGroups.bib.map(t => (
                <button
                  type="button"
                  key={t.name}
                  className={`pc-trait-card${filters.bib === t.name ? ' selected' : ''}`}
                  onClick={() => toggleTrait('bib', t.name)}
                  aria-pressed={filters.bib === t.name}
                >
                  <div className="pc-trait-name">{t.name}</div>
                  <TraitBadge trait={t} />
                </button>
              ))}
            </div>
          </section>

          {hasActiveFilter && (
            <section className="pc-results-section" ref={resultsRef}>
              <h3 className="pc-section-title">Результат</h3>

              {petIdInvalid && (
                <div className="pc-lookup-status pc-lookup-status--error">
                  Номер Pet должен быть от {MIN_PET_NFT_ID} до {MAX_PET_NFT_ID}.
                </div>
              )}
              {!petIdInvalid && filterStatus === 'loading' && <div className="pc-lookup-status">Ищем подходящих Pet…</div>}
              {!petIdInvalid && filterStatus === 'error' && (
                <div className="pc-lookup-status pc-lookup-status--error">Не удалось выполнить поиск.</div>
              )}

              {!petIdInvalid && filterStatus === 'idle' && results !== null && (
                resultsTotal === 0 ? (
                  <div className="pc-lookup-status pc-lookup-status--error">
                    Такой комбинации трейтов не существует ни у одного заминченного Pet NFT.
                  </div>
                ) : resultsTotal === 1 ? (
                  <NftDetailCard pet={results[0]} traits={nftTraits} />
                ) : (
                  <>
                    <div className="pc-filter-count">Найдено: <strong>{resultsTotal}</strong> Pet</div>
                    <div className="pc-instance-grid">
                      {results.map(p => <NftInstanceCard key={p.petId} pet={p} />)}
                    </div>
                    {results.length < resultsTotal && (
                      <button
                        type="button"
                        className="pc-filter-more"
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
        </>
      )}
    </div>
  );
}
