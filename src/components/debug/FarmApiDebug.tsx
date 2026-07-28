import { useState } from 'react';
import { useFarmData } from '../../lib/useFarmData';
import { fetchFarms, type FarmResponse } from '../../lib/farmApi';

type LogEntry = {
  at: string;
  label: string;
  ms: number;
  ok: boolean;
  detail: string;
};

function nowLabel() {
  return new Date().toLocaleTimeString('ru-RU', { hour12: false });
}

export default function FarmApiDebug() {
  const [farmIdInput, setFarmIdInput] = useState('');
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const { farm, loading, refreshing, error, staleNotice, refresh, retry } = useFarmData(activeFarmId);

  const [batchInput, setBatchInput] = useState('');
  const [batchResult, setBatchResult] = useState<Record<string, FarmResponse | null> | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [log, setLog] = useState<LogEntry[]>([]);

  function pushLog(entry: LogEntry) {
    setLog((prev) => [entry, ...prev].slice(0, 30));
  }

  function handleFetch() {
    const trimmed = farmIdInput.trim();
    if (!trimmed) return;
    const startedAt = performance.now();
    setActiveFarmId(trimmed);
    // useFarmData сам логирует запрос через свой error/farm стейт; отдельно
    // логируем факт клика для видимости момента запуска.
    pushLog({
      at: nowLabel(),
      label: `GET /farm/${trimmed}`,
      ms: 0,
      ok: true,
      detail: 'запрос отправлен',
    });
    void startedAt;
  }

  function handleRefresh() {
    if (!activeFarmId) return;
    pushLog({
      at: nowLabel(),
      label: `POST /farm/${activeFarmId}/refresh`,
      ms: 0,
      ok: true,
      detail: 'обновление запущено, ждём поллинг',
    });
    refresh();
  }

  async function handleBatch() {
    const ids = batchInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;

    setBatchLoading(true);
    setBatchError(null);
    setBatchResult(null);
    const startedAt = performance.now();

    try {
      const res = await fetchFarms(ids);
      const ms = Math.round(performance.now() - startedAt);
      setBatchResult(res);
      pushLog({
        at: nowLabel(),
        label: `GET /farms?ids=${ids.join(',')}`,
        ms,
        ok: true,
        detail: `${Object.keys(res).length} ферм в ответе`,
      });
    } catch (e) {
      const ms = Math.round(performance.now() - startedAt);
      const message = e instanceof Error ? e.message : 'неизвестная ошибка';
      setBatchError(message);
      pushLog({
        at: nowLabel(),
        label: `GET /farms?ids=${ids.join(',')}`,
        ms,
        ok: false,
        detail: message,
      });
    } finally {
      setBatchLoading(false);
    }
  }

  return (
    <div className="gc-debug-grid">
      <section className="gc-calc-card">
        <h2 className="gc-calc-h2">1. Одна ферма — fetchFarm / refreshFarm</h2>

        <div className="gc-debug-row">
          <input
            type="text"
            placeholder="farm_id"
            value={farmIdInput}
            onChange={(e) => setFarmIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
          />
          <button className="gc-btn gc-btn-secondary" onClick={handleFetch}>
            Получить
          </button>
          <button
            className="gc-btn gc-btn-secondary"
            onClick={handleRefresh}
            disabled={!activeFarmId || refreshing}
          >
            {refreshing ? 'Обновляется…' : 'Обновить (refresh + poll)'}
          </button>
          {error && (
            <button className="gc-btn gc-btn-secondary" onClick={retry}>
              Повторить
            </button>
          )}
        </div>

        {loading && <p className="gc-debug-status">Загрузка…</p>}
        {error && <p className="gc-debug-status gc-debug-status--error">Ошибка: {error}</p>}
        {staleNotice && (
          <p className="gc-debug-status gc-debug-status--warn">
            Обновление не подтвердилось за 10с — updated_at не изменился (таймаут поллинга).
          </p>
        )}

        {farm && (
          <div className="gc-debug-result">
            <div className="gc-debug-kv">
              <span>farm_id</span>
              <strong>{farm.farm_id}</strong>
            </div>
            <div className="gc-debug-kv">
              <span>updated_at</span>
              <strong>{farm.updated_at}</strong>
            </div>
            <pre className="gc-debug-json">{JSON.stringify(farm.data, null, 2)}</pre>
          </div>
        )}
      </section>

      <section className="gc-calc-card">
        <h2 className="gc-calc-h2">2. Пакетный запрос — fetchFarms</h2>

        <div className="gc-debug-row">
          <input
            type="text"
            placeholder="farm_id через запятую, напр. 1,2,3"
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBatch()}
          />
          <button className="gc-btn gc-btn-secondary" onClick={handleBatch} disabled={batchLoading}>
            {batchLoading ? 'Загрузка…' : 'Получить'}
          </button>
        </div>

        {batchError && <p className="gc-debug-status gc-debug-status--error">Ошибка: {batchError}</p>}

        {batchResult && (
          <div className="gc-debug-table-wrap">
            <table className="gc-calc-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Статус</th>
                  <th>updated_at</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(batchResult).map(([id, res]) => (
                  <tr key={id}>
                    <td>{id}</td>
                    <td data-profit={res ? 'good' : 'bad'}>{res ? 'ok' : 'null'}</td>
                    <td>{res?.updated_at ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="gc-calc-card gc-debug-log-section">
        <h2 className="gc-calc-h2">Лог запросов</h2>
        {log.length === 0 ? (
          <p className="gc-debug-status">Пока пусто — сделайте запрос выше.</p>
        ) : (
          <ul className="gc-debug-log">
            {log.map((entry, i) => (
              <li key={i} className={entry.ok ? '' : 'gc-debug-log-item--error'}>
                <span className="gc-debug-log-time">{entry.at}</span>
                <span className="gc-debug-log-label">{entry.label}</span>
                {entry.ms > 0 && <span className="gc-debug-log-ms">{entry.ms}ms</span>}
                <span className="gc-debug-log-detail">{entry.detail}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
