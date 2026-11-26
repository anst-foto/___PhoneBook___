import type { HealthStatus, Result } from '../types';
import type { ApiError } from './errors';
import { request } from './http';

interface HealthResponse {
  readonly status: HealthStatus;
}

export const checkHealth = (): Promise<Result<HealthResponse, ApiError>> =>
  request<HealthResponse>('/health');

export const checkReady = (): Promise<Result<HealthResponse, ApiError>> =>
  request<HealthResponse>('/ready');