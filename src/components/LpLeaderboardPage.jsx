const fmtUsd = (n) =>
  n.toLocaleString('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtUsdPrecise = (n) =>
  n.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

const shortAddr = (addr) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

function formatUpdatedAt(iso) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  let relative;
  if (diffMin < 1) relative = 'только что';
  else if (diffMin < 60) relative = `${diffMin} мин назад`;
  else if (diffMin < 60 * 24) relative = `${Math.round(diffMin / 60)} ч назад`;
  else relative = `${Math.round(diffMin / (60 * 24))} дн назад`;

  const absolute = date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { relative, absolute };
}

function RankChange({ rank, prevRank }) {
  if (prevRank == null) {
    return <span className="gc-lp-rank-badge gc-lp-rank-new">Новичок</span>;
  }
  const delta = prevRank - rank;
  if (delta > 0) {
    return <span className="gc-lp-rank-badge gc-lp-rank-up">▲ {delta}</span>;
  }
  if (delta < 0) {
    return <span className="gc-lp-rank-badge gc-lp-rank-down">▼ {Math.abs(delta)}</span>;
  }
  return <span className="gc-lp-rank-badge gc-lp-rank-same">—</span>;
}

export default function LpLeaderboardPage({ leaderboard = [], meta }) {
  if (!leaderboard.length) {
    return (
      <div className="gc-community-empty gc-card">
        <img className="gc-community-empty-icon" src="/sprites/icons/money_bag.png" alt="" width="40" height="40" />
        <p className="gc-community-empty-text">
          Лидерборд пока пуст. Данные обновляются пакетной задачей — загляните позже.
        </p>
      </div>
    );
  }

  const updated = meta?.updated_at ? formatUpdatedAt(meta.updated_at) : null;

  return (
    <>
      {meta && (
        <div className="gc-lp-meta gc-card">
          <div className="gc-lp-meta-stat">
            <div className="gc-lp-meta-val">{fmtUsd(meta.total_tvl)}</div>
            <div className="gc-lp-meta-label">Общий TVL</div>
          </div>
          <div className="gc-lp-meta-stat">
            <div className="gc-lp-meta-val">{meta.wallets.toLocaleString('ru-RU')}</div>
            <div className="gc-lp-meta-label">Кошельков</div>
          </div>
          <div className="gc-lp-meta-stat">
            <div className="gc-lp-meta-val">{fmtUsdPrecise(meta.flower_price_usd)}</div>
            <div className="gc-lp-meta-label">Цена FLOWER</div>
          </div>
          {updated && (
            <div className="gc-lp-meta-stat">
              <div className="gc-lp-meta-val" title={updated.absolute}>{updated.relative}</div>
              <div className="gc-lp-meta-label">Обновлено</div>
            </div>
          )}
        </div>
      )}

      <div className="gc-lp-table gc-card">
        <div className="gc-lp-row gc-lp-row-head">
          <span className="gc-lp-col-rank">#</span>
          <span className="gc-lp-col-owner">Кошелёк</span>
          <span className="gc-lp-col-value">Стоимость LP</span>
          <span className="gc-lp-col-positions">Позиций</span>
          <span className="gc-lp-col-change">Изменение</span>
        </div>
        {leaderboard.map((entry) => (
          <div className="gc-lp-row" key={entry.owner}>
            <span className="gc-lp-col-rank">{entry.rank}</span>
            <span className="gc-lp-col-owner" title={entry.owner}>
              {shortAddr(entry.owner)}
            </span>
            <span className="gc-lp-col-value">{fmtUsd(entry.value_usd)}</span>
            <span className="gc-lp-col-positions">{entry.positions}</span>
            <span className="gc-lp-col-change">
              <RankChange rank={entry.rank} prevRank={entry.prev_rank} />
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
