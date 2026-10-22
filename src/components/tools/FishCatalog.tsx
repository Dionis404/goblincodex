import { useMemo, useState } from 'react';
import { NO_FISHING_BOOSTS, type FishingBoosts } from '../../lib/fishYield';
import './FishCatalog.css';
import CrustaceanCosts from './CrustaceanCosts';
import BaitRecipes from './BaitRecipes';
import { CHUM_AMOUNTS } from '../../lib/fishData.generated';
import {
  BAIT_INFO,
  BAIT_ORDER,
  GUARANTEED_CATCH,
  GUARANTEED_INFO,
  GUARANTEED_ORDER,
  SEASONS,
  SEASON_INFO,
  TIER_LABELS,
  TIER_ORDER,
  fishIcon,
  guaranteedBaitsFor,
  regularFish,
  type Tier,
} from '../../lib/fishCatalog';

function FishIcon({ name, size = 28 }: { name: string; size?: number }) {
  const src = fishIcon(name);
  if (!src) {
    return (
      <span className="ref-fish-icon ref-fish-icon--none" style={{ width: size, height: size }} aria-hidden="true">
        🐟
      </span>
    );
  }
  return <img src={src} alt="" className="ref-fish-icon" style={{ width: size, height: size }} />;
}

function BaitChips({ baits }: { baits: string[] }) {
  if (baits.length === 0) return <span className="ref-price-hint">—</span>;
  const sorted = [...baits].sort((a, b) => BAIT_ORDER.indexOf(a) - BAIT_ORDER.indexOf(b));
  return (
    <span className="ref-resource-chips">
      {sorted.map((b) => (
        <span className="ref-resource-chip" key={b} title={BAIT_INFO[b]?.label ?? b}>
          {BAIT_INFO[b] && <img src={BAIT_INFO[b].icon} alt="" className="gc-res-icon" />}
          {b}
        </span>
      ))}
    </span>
  );
}

function GuaranteedCards() {
  return (
    <div className="ref-bait-list">
      {GUARANTEED_ORDER.map((bait) => (
        <div className="ref-bait-card" key={bait}>
          <div className="ref-bait-header">
            <span className="ref-bait-name">
              <img src={GUARANTEED_INFO[bait].icon} alt="" className="gc-res-icon" /> {bait}
            </span>
            <span className="ref-bait-tier">{GUARANTEED_INFO[bait].tier}</span>
          </div>
          <div className="ref-bait-fish">
            {GUARANTEED_CATCH[bait].map((f) => (
              <span className="ref-fish-chip ref-fish-chip--icon" key={f}>
                <FishIcon name={f} size={16} />
                {f}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const ALL = 'all';

function FishTable() {
  const all = useMemo(() => regularFish(), []);
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<string>(ALL);
  const [season, setSeason] = useState<string>(ALL);
  const [bait, setBait] = useState<string>(ALL);

  const rows = all.filter(
    (f) =>
      (tier === ALL || f.type === tier) &&
      (season === ALL || f.seasons.includes(season)) &&
      (bait === ALL || f.baits.includes(bait)) &&
      (!query.trim() || f.name.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const filtered = tier !== ALL || season !== ALL || bait !== ALL || query.trim() !== '';

  return (
    <div className="ref-fish-wrap">
      <div className="ref-marvel-boost-widget ref-fish-filters">
        <input
          type="search"
          className="ref-fish-search"
          placeholder="Найти рыбу…"
          value={query}
          maxLength={40}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск рыбы"
        />
        <label className="ref-fish-filter">
          <span>Ранг</span>
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="ref-food-rank-select">
            <option value={ALL}>все</option>
            {TIER_ORDER.map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="ref-fish-filter">
          <span>Сезон</span>
          <select value={season} onChange={(e) => setSeason(e.target.value)} className="ref-food-rank-select">
            <option value={ALL}>все</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{SEASON_INFO[s].emoji} {SEASON_INFO[s].label}</option>
            ))}
          </select>
        </label>
        <label className="ref-fish-filter">
          <span>Наживка</span>
          <select value={bait} onChange={(e) => setBait(e.target.value)} className="ref-food-rank-select">
            <option value={ALL}>любая</option>
            {BAIT_ORDER.map((b) => (
              <option key={b} value={b}>{b} · {BAIT_INFO[b].label}</option>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            className="gc-btn-secondary ref-fish-reset"
            onClick={() => { setQuery(''); setTier(ALL); setSeason(ALL); setBait(ALL); }}
          >
            Сбросить
          </button>
        )}
        <span className="ref-price-hint ref-fish-count">{rows.length} из {all.length}</span>
      </div>

      <div className="ref-table-wrap">
        <table className="ref-table ref-fish-table">
          <thead>
            <tr>
              <th>Рыба</th>
              <th>Наживка</th>
              <th>Сезоны</th>
              <th>Гарантия</th>
              <th>Приманка (повышает шанс)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="ref-fish-empty">
                <td colSpan={5}>Ничего не найдено — попробуйте сбросить фильтры.</td>
              </tr>
            )}
            {rows.map((f) => {
              const guaranteed = guaranteedBaitsFor(f.name);
              return (
                <tr key={f.name}>
                  <td className="ref-table-name ref-fish-cell--name">
                    <span className="ref-tool-name">
                      <FishIcon name={f.name} />
                      <span>
                        {f.name}
                        <span className="ref-tool-sub">{TIER_LABELS[f.type as Tier] ?? f.type}</span>
                      </span>
                    </span>
                  </td>
                  <td data-label="Наживка"><BaitChips baits={f.baits} /></td>
                  <td data-label="Сезоны">
                    {f.seasons.length === SEASONS.length ? (
                      <span className="ref-price-hint">круглый год</span>
                    ) : (
                      <span className="ref-fish-seasons">
                        {f.seasons.map((s) => (
                          <span key={s} title={SEASON_INFO[s]?.label}>{SEASON_INFO[s]?.emoji ?? s}</span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td data-label="Гарантия">
                    {guaranteed.length === 0 ? (
                      <span className="ref-price-hint">—</span>
                    ) : (
                      <span className="ref-resource-chips">
                        {guaranteed.map((g) => (
                          <span className="ref-resource-chip" key={g}>
                            <img src={GUARANTEED_INFO[g].icon} alt="" className="gc-res-icon" />
                            {g}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td data-label="Приманка">
                    {f.likes.length === 0 ? (
                      <span className="ref-price-hint">—</span>
                    ) : (
                      <span className="ref-fish-likes">
                        {f.likes.map((l) => (
                          <span className="ref-fish-like" key={l}>
                            {l}{CHUM_AMOUNTS[l] ? <span className="ref-price-hint"> ×{CHUM_AMOUNTS[l]}</span> : null}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FishCatalog() {
  // Бусты рыбалки общие: от них зависит цена рыбы, а через неё — наживок и приманок раков.
  const [fishing, setFishing] = useState<FishingBoosts>(NO_FISHING_BOOSTS);
  return (
    <div className="ref-fish-catalog">
      <h3 className="ref-fish-h">Гарантированный улов</h3>
      <p className="ref-section-desc">
        Эти наживки не ловят случайную рыбу — перед забросом вы выбираете рыбу из списка, и она клюёт
        наверняка. С такой наживкой приманку (chum) использовать нельзя.
      </p>
      <GuaranteedCards />

      <h3 className="ref-fish-h">Как сделать наживку и сколько это стоит</h3>
      <p className="ref-section-desc">
        Гарантирующие наживки делают из рыбы в Fish Market. Рецепт — постоянная часть плюс две
        рыбы или существа, которые зависят от сезона года в игре.
      </p>
      <BaitRecipes fishing={fishing} onFishingChange={setFishing} />

      <h3 className="ref-fish-h">Что и на что ловить</h3>
      <p className="ref-section-desc">
        Улов можно подстроить двумя способами. <strong>Гарантия</strong> — особая наживка (Fish Flake,
        Fish Stick, Fish Oil, Crab Stick): с ней выбранная рыба клюёт наверняка. <strong>Приманка
        (chum)</strong> — предмет, который лишь повышает шанс поймать именно эту рыбу, гарантии не
        даёт; в таблице — сколько его уходит за один заброс. «Наживка» — какой червь (или блесна)
        подходит рыбе, «Сезоны» — когда она может клюнуть. Точные шансы улова знает только сервер
        игры, поэтому в таблице их нет.
      </p>
      <p className="ref-section-desc">
        Как получить марвелов через куски карты — в разделе{' '}
        <a href="/codex?tab=mechanics&amp;ref=marvels">Морские марвелы</a>.
      </p>
      <FishTable />

      <h3 className="ref-fish-h">Раки: Crab Pot и Mariner Pot</h3>
      <p className="ref-section-desc">
        В ловушку кладут приманку и ждут: что попадётся, зависит только от ловушки и приманки, случая
        здесь нет. Цена — установка целиком: ловушка (монеты по рыночному курсу и ресурсы) плюс
        приманка по floor-цене маркетплейса. Ловушка тратится при каждой установке. Fish Stick, Fish
        Oil и Crab Stick не торгуются — их цена посчитана по рецепту (см. выше) и помечена «≈». Если
        у наживки всё же нет цены, стоит «от» и указана недостающая приманка.
      </p>
      <CrustaceanCosts fishing={fishing} />
    </div>
  );
}
