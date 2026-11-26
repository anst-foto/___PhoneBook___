import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './http';

describe('request', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns ok Result on 200', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));

    const result = await request<{ id: number }>('/x');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual({ id: 1 });
  });

  it('returns validation ApiError on 400 with errors body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: { name: ['empty'] } }), { status: 400 }),
    );

    const result = await request<unknown>('/x');

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.kind === 'validation') {
      expect(result.error.errors).toEqual({ name: ['empty'] });
    } else {
      throw new Error('Expected validation error');
    }
  });

  it('returns network ApiError when fetch rejects', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('boom'));

    const result = await request<unknown>('/x');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('network');
  });
});
