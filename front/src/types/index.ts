export interface PhoneBookItem {
  readonly id: number;
  readonly name: string;
  readonly number: string;
}

export interface CreatePhoneBookItemRequest {
  readonly name: string;
  readonly phone: string;
}

export interface CreatePhoneBookItemResponse {
  readonly id: number;
}

export type HealthStatus = 'Healthy' | 'Unhealthy';

export type { Result } from './result';