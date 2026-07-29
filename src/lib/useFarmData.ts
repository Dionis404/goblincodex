import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFarm, type FarmResponse } from './farmApi';

const POLL_INTERVAL_MS = 1750;
const POLL_TIMEOUT_MS = 10000;

export type FarmDataState = {
  farm: FarmResponse | null;
  /** Первичная загрузка (фермы ещё нет на экране). */
  loading: boolean;
  /** Идёт force-refresh — фермa уже показана, крутится локальный спиннер. */
  refreshing: boolean;
  error: string | null;
  /** "Не удалось обновить" после таймаута поллинга — данные показаны как есть. */
  staleNotice: boolean;
  refresh: () => void;
  retry: () => void;
};

/** Подгружает данные фермы по ID через goblin-api и умеет форс-обновлять их с поллингом. */
export function useFarmData(farmId: number | string | null): FarmDataState {
  const [farm, setFarm] = useState<FarmResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNotice, setStaleNotice] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (pollDeadline.current) clearTimeout(pollDeadline.current);
    pollTimer.current = null;
    pollDeadline.current = null;
  }, []);

  const load = useCallback((id: number | string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    fetchFarm(id, controller.signal)
      .then((res) => {
        setFarm(res);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'SFL сейчас недоступен');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    stopPolling();
    if (farmId === null || farmId === undefined || farmId === '') {
      setFarm(null);
      setError(null);
      setLoading(false);
      return;
    }
    setStaleNotice(false);
    load(farmId);
    return () => {
      abortRef.current?.abort();
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, load]);

  const retry = useCallback(() => {
    if (farmId === null || farmId === undefined || farmId === '') return;
    load(farmId);
  }, [farmId, load]);

  /**
   * Нет отдельного refresh-эндпоинта — goblin-api обновляет запись в фоне при
   * каждом запросе GET /farms. "Обновить" здесь означает: перезапросить и
   * подождать, пока updated_at не станет новее момента клика (фон успевает
   * за несколько секунд), либо сдаться по таймауту.
   */
  const refresh = useCallback(() => {
    if (farmId === null || farmId === undefined || farmId === '') return;
    stopPolling();
    setStaleNotice(false);
    setRefreshing(true);

    const clickedAt = Date.now();

    pollTimer.current = setInterval(() => {
      fetchFarm(farmId)
        .then((res) => {
          if (res && new Date(res.updated_at).getTime() > clickedAt) {
            setFarm(res);
            setRefreshing(false);
            stopPolling();
          }
        })
        .catch(() => {
          // Отдельный сбой одного тика поллинга не прерываем — подождём таймаута.
        });
    }, POLL_INTERVAL_MS);

    pollDeadline.current = setTimeout(() => {
      stopPolling();
      setRefreshing(false);
      setStaleNotice(true);
    }, POLL_TIMEOUT_MS);
  }, [farmId, stopPolling]);

  return { farm, loading, refreshing, error, staleNotice, refresh, retry };
}
