import { useEffect, useState } from 'react';
import { checkHealth, checkReady } from '../api/health';

export type HealthCheck = 'checking' | 'healthy' | 'unhealthy';

export interface HealthChecks {
  readonly api: HealthCheck;
  readonly db: HealthCheck;
}

const toCheck = (ok: boolean, healthy: boolean | null): HealthCheck => {
  if (!ok || healthy === null) return 'unhealthy';
  return healthy ? 'healthy' : 'unhealthy';
};

export const useHealth = (intervalMs = 10_000): HealthChecks => {
  const [api, setApi] = useState<HealthCheck>('checking');
  const [db, setDb] = useState<HealthCheck>('checking');

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const [health, ready] = await Promise.all([checkHealth(), checkReady()]);
      if (cancelled) return;

      setApi(
        toCheck(
          health.ok,
          health.ok ? health.value.status === 'Healthy' : null,
        ),
      );
      setDb(
        toCheck(ready.ok, ready.ok ? ready.value.status === 'Healthy' : null),
      );
    };

    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return { api, db };
};