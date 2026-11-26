import type {
  CreatePhoneBookItemRequest,
  CreatePhoneBookItemResponse,
  PhoneBookItem,
  Result,
} from '../types';
import type { ApiError } from './errors';
import { request } from './http';

const BASE = '/api/phonebook';

export const getAll = (
  signal?: AbortSignal,
): Promise<Result<readonly PhoneBookItem[], ApiError>> =>
  request<readonly PhoneBookItem[]>(BASE, { signal });

export const add = (
  payload: CreatePhoneBookItemRequest,
  signal?: AbortSignal,
): Promise<Result<CreatePhoneBookItemResponse, ApiError>> =>
  request<CreatePhoneBookItemResponse>(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });