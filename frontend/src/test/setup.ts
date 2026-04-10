import { vi, beforeEach } from 'vitest';

// Node 22+ ships a native localStorage Proxy that lacks clear() and conflicts with jsdom.
// Replace it with a simple in-memory implementation before any test code runs.
if (typeof globalThis.localStorage !== 'undefined' && typeof globalThis.localStorage.clear !== 'function') {
  const store: Record<string, string> = {};
  const ls = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', { value: ls, writable: true, configurable: true });
}

// Mock axios-based api module to always reject (simulates demo mode)
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('Demo mode')),
    post: vi.fn().mockRejectedValue(new Error('Demo mode')),
    put: vi.fn().mockRejectedValue(new Error('Demo mode')),
    patch: vi.fn().mockRejectedValue(new Error('Demo mode')),
    delete: vi.fn().mockRejectedValue(new Error('Demo mode')),
  },
}));

// Mock socket module
vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn().mockReturnValue(null),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Clean localStorage before each test
beforeEach(() => {
  localStorage.clear();
});
