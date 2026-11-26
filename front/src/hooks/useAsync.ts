import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from '../types';

export interface AsyncState<T, E> {
  readonly data: T | null;
  readonly error: E | null;
  readonly loading: boolean;
}

export interface UseAsyncResult<T, E> extends AsyncState<T, E> {
  readonly reload: () => void;
}

export const useAsync = <T, E>(
  fn: (signal: AbortSignal) => Promise<Result<T, E>>,
): UseAsyncResult<T, E> => {
  const [state, setState] = useState<AsyncState<T, E>>({
    data: null,
    error: null,
    loading: true,
  });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setState({ data: null, error: null, loading: true });

    fnRef
      .current(controller.signal)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setState({ data: result.value, error: null, loading: false });
        } else {
          setState({ data: null, error: result.error, loading: false });
        }
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const name = (cause as { name?: string } | null)?.name;
        if (name === 'AbortError') return;
        setState({
          data: null,
          error: cause as E,
          loading: false,
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [nonce]);

  return { ...state, reload };
};