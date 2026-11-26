import type { Result } from '../types/result';
import { err, ok } from '../types/result';
import type { ApiError } from './errors';

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isValidationProblem = (
  value: unknown,
): value is { errors: Readonly<Record<string, readonly string[]>> } => {
  if (typeof value !== 'object' || value === null) return false;
  const errors = (value as { errors?: unknown }).errors;
  return typeof errors === 'object' && errors !== null;
};

const extractMessage = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { detail?: unknown; title?: unknown };
    if (typeof obj.detail === 'string') return obj.detail;
    if (typeof obj.title === 'string') return obj.title;
  }
  return null;
};

export const request = async <T>(
  input: string,
  init?: RequestInit,
): Promise<Result<T, ApiError>> => {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (cause) {
    return err({
      kind: 'network',
      message: cause instanceof Error ? cause.message : 'Network error',
    });
  }

  const body = await parseBody(response);

  if (response.ok) {
    return ok(body as T);
  }

  if (response.status === 400 && isValidationProblem(body)) {
    return err({ kind: 'validation', errors: body.errors });
  }

  return err({
    kind: 'http',
    status: response.status,
    message: extractMessage(body) ?? `HTTP ${response.status}`,
  });
};