import { useCallback, useState } from 'react';

export type FieldErrors = Readonly<Record<string, readonly string[]>>;
export type Validator<T> = (values: T) => FieldErrors;
export type SubmitHandler<T> = (values: T) => Promise<FieldErrors | void>;

export interface UseFormOptions<T> {
  readonly initial: T;
  readonly validate: Validator<T>;
  readonly onSubmit: SubmitHandler<T>;
}

export interface UseFormResult<T> {
  readonly values: T;
  readonly errors: FieldErrors;
  readonly submitting: boolean;
  readonly setField: <K extends keyof T & string>(field: K, value: T[K]) => void;
  readonly submit: () => Promise<void>;
  readonly reset: () => void;
}

export const GENERAL_ERROR_KEY = '_general';

const clearKey = (errors: FieldErrors, key: string): FieldErrors => {
  if (!(key in errors)) return errors;
  return Object.fromEntries(
    Object.entries(errors).filter(([errorKey]) => errorKey !== key),
  );
};

export const useForm = <T extends object>(
  options: UseFormOptions<T>,
): UseFormResult<T> => {
  const [values, setValues] = useState<T>(options.initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof T & string>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => clearKey(clearKey(prev, field), GENERAL_ERROR_KEY));
    },
    [],
  );

  const reset = useCallback(() => {
    setValues(options.initial);
    setErrors({});
  }, [options.initial]);

  const submit = useCallback(async () => {
    const localErrors = options.validate(values);
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      const serverErrors = await options.onSubmit(values);
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        return;
      }
      reset();
    } finally {
      setSubmitting(false);
    }
  }, [values, options, reset]);

  return { values, errors, submitting, setField, submit, reset };
};
