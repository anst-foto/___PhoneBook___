import { useCallback, useState } from 'react';
import { add as addApi, getAll } from '../api/phonebook';
import { formatApiError } from '../api/errors';
import type { PhoneBookItem } from '../types';
import { useAsync } from './useAsync';

export type AddOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
      readonly generalError?: string;
    };

export interface UsePhoneBookResult {
  readonly items: readonly PhoneBookItem[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly adding: boolean;
  readonly add: (name: string, phone: string) => Promise<AddOutcome>;
  readonly reload: () => void;
}

export const usePhoneBook = (): UsePhoneBookResult => {
  const { data, error, loading, reload } = useAsync(getAll);
  const [adding, setAdding] = useState(false);

  const add = useCallback(
    async (name: string, phone: string): Promise<AddOutcome> => {
      setAdding(true);
      const result = await addApi({ name, phone });
      setAdding(false);

      if (result.ok) {
        reload();
        return { ok: true };
      }
      if (result.error.kind === 'validation') {
        return { ok: false, fieldErrors: result.error.errors };
      }
      return { ok: false, generalError: formatApiError(result.error) };
    },
    [reload],
  );

  return {
    items: data ?? [],
    loading,
    error: error ? formatApiError(error) : null,
    adding,
    add,
    reload,
  };
};