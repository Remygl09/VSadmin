import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('validateEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');

    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('throws when VITE_SUPABASE_PUBLISHABLE_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');

    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).toThrow('Missing required environment variables');
  });

  it('does not throw when both env vars are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');

    const { validateEnv } = await import('@/lib/env');
    expect(() => validateEnv()).not.toThrow();
  });
});
