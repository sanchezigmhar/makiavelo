import { vi, beforeEach } from 'vitest';

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
