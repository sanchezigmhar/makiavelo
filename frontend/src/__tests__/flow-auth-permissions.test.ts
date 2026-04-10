/**
 * AUTH & PERMISSIONS TESTS
 * Priority 1 — Critical for access control and session management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hasPermission, hasAnyPermission, getDefaultRoute, DEMO_PERMISSIONS } from '@/lib/permissions';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

// ============================================================
// Auth Store Tests
// ============================================================
describe('Auth store (demo mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset store state between tests
    useAuthStore.setState({
      user: null,
      token: null,
      branch: null,
      isAuthenticated: false,
      isLoading: false,
      isOnline: true,
    });
  });

  it('login with valid demo credentials sets authenticated state', async () => {
    await useAuthStore.getState().login('admin@makiavelo.com', 'admin123');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).not.toBeNull();
    expect(state.user?.name).toBe('Carlos Lopez');
    expect(state.token).toBe('demo-token-makicore');
    expect(state.branch).not.toBeNull();
    expect(localStorage.getItem('maki_token')).toBe('demo-token-makicore');
    expect(localStorage.getItem('maki_branch_id')).toBe('branch-1');
  });

  it('login with invalid credentials throws error', async () => {
    await expect(
      useAuthStore.getState().login('wrong@email.com', 'wrongpassword')
    ).rejects.toThrow('Credenciales incorrectas');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('loginWithPin with correct PIN for Carlos (1111) succeeds', async () => {
    await useAuthStore.getState().loginWithPin('1', '1111');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Carlos Lopez');
    expect(state.user?.role?.slug).toBe('manager');
  });

  it('loginWithPin with correct PIN for Sofia/Cajera (6666) succeeds', async () => {
    await useAuthStore.getState().loginWithPin('6', '6666');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Sofia Mendez');
    expect(state.user?.role?.slug).toBe('cashier');
  });

  it('loginWithPin with wrong PIN throws error', async () => {
    await expect(
      useAuthStore.getState().loginWithPin('1', '9999')
    ).rejects.toThrow('PIN incorrecto');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('loginWithPin with non-existent userId throws error', async () => {
    await expect(
      useAuthStore.getState().loginWithPin('999', '1111')
    ).rejects.toThrow('PIN incorrecto');
  });

  it('logout clears all state and localStorage', async () => {
    // Login first
    await useAuthStore.getState().login('admin@makiavelo.com', 'admin123');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Logout
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.branch).toBeNull();
    expect(localStorage.getItem('maki_token')).toBeNull();
    expect(localStorage.getItem('maki_branch_id')).toBeNull();
    // maki-auth may still exist (Zustand persist saves the "logged out" state)
    // but user/token inside it should be null
    const persisted = localStorage.getItem('maki-auth');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      expect(parsed.state.user).toBeNull();
      expect(parsed.state.token).toBeNull();
      expect(parsed.state.isAuthenticated).toBe(false);
    }
  });

  it('checkAuth with demo token stays authenticated', async () => {
    // Login first to set demo token
    await useAuthStore.getState().login('admin@makiavelo.com', 'admin123');
    // checkAuth should not change state
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('checkAuth with no token sets unauthenticated', async () => {
    localStorage.removeItem('maki_token');
    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('each demo user has correct role slug', async () => {
    const pinMap: [string, string, string][] = [
      ['1', '1111', 'manager'],
      ['2', '2222', 'waiter'],
      ['3', '3333', 'kitchen'],
      ['4', '4444', 'waiter'],
      ['5', '5555', 'bartender'],
      ['6', '6666', 'cashier'],
    ];
    for (const [userId, pin, expectedSlug] of pinMap) {
      useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
      await useAuthStore.getState().loginWithPin(userId, pin);
      expect(useAuthStore.getState().user?.role?.slug).toBe(expectedSlug);
    }
  });
});

// ============================================================
// Permissions Tests
// ============================================================
describe('Permissions', () => {

  const makeUser = (slug: string, permissions: string[] = []): User => ({
    id: '1',
    name: 'Test',
    email: 'test@test.com',
    role: { id: '1', name: slug, slug, permissions },
    roleId: '1',
    branchId: 'b1',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  });

  it('returns false for null user', () => {
    expect(hasPermission(null, 'dashboard')).toBe(false);
  });

  it('owner always has access to everything', () => {
    const owner = makeUser('owner');
    expect(hasPermission(owner, 'dashboard')).toBe(true);
    expect(hasPermission(owner, 'payments')).toBe(true);
    expect(hasPermission(owner, 'kds')).toBe(true);
    expect(hasPermission(owner, 'settings')).toBe(true);
  });

  it('admin always has access to everything', () => {
    const admin = makeUser('admin');
    expect(hasPermission(admin, 'dashboard')).toBe(true);
    expect(hasPermission(admin, 'payments')).toBe(true);
  });

  it('manager always has access to everything', () => {
    const mgr = makeUser('manager');
    expect(hasPermission(mgr, 'payments')).toBe(true);
    expect(hasPermission(mgr, 'settings')).toBe(true);
  });

  it('waiter can access tables, orders, products, payments', () => {
    const waiter = makeUser('waiter');
    expect(hasPermission(waiter, 'tables')).toBe(true);
    expect(hasPermission(waiter, 'orders')).toBe(true);
    expect(hasPermission(waiter, 'products')).toBe(true);
    expect(hasPermission(waiter, 'payments')).toBe(true);
  });

  it('waiter cannot access dashboard, kds, settings, users', () => {
    const waiter = makeUser('waiter');
    expect(hasPermission(waiter, 'dashboard')).toBe(false);
    expect(hasPermission(waiter, 'kds')).toBe(false);
    expect(hasPermission(waiter, 'settings')).toBe(false);
    expect(hasPermission(waiter, 'users')).toBe(false);
  });

  it('kitchen can access kds and inventory only', () => {
    const chef = makeUser('kitchen');
    expect(hasPermission(chef, 'kds')).toBe(true);
    expect(hasPermission(chef, 'inventory')).toBe(true);
    expect(hasPermission(chef, 'tables')).toBe(false);
    expect(hasPermission(chef, 'payments')).toBe(false);
  });

  it('cashier can access orders, payments, customers, products', () => {
    const cashier = makeUser('cashier');
    expect(hasPermission(cashier, 'orders')).toBe(true);
    expect(hasPermission(cashier, 'payments')).toBe(true);
    expect(hasPermission(cashier, 'customers')).toBe(true);
    expect(hasPermission(cashier, 'products')).toBe(true);
    expect(hasPermission(cashier, 'tables')).toBe(false);
  });

  it('bartender can only access kds', () => {
    const bartender = makeUser('bartender');
    expect(hasPermission(bartender, 'kds')).toBe(true);
    expect(hasPermission(bartender, 'tables')).toBe(false);
    expect(hasPermission(bartender, 'payments')).toBe(false);
  });

  it('hostess can access reservations and customers', () => {
    const hostess = makeUser('hostess');
    expect(hasPermission(hostess, 'reservations')).toBe(true);
    expect(hasPermission(hostess, 'customers')).toBe(true);
    expect(hasPermission(hostess, 'tables')).toBe(false);
  });

  it('falls back to DEMO_PERMISSIONS when role.permissions is empty', () => {
    const waiter = makeUser('waiter', []); // empty permissions
    expect(hasPermission(waiter, 'tables')).toBe(true); // from DEMO_PERMISSIONS
  });

  it('uses explicit permissions when provided', () => {
    const user = makeUser('waiter', ['kds', 'inventory']); // override
    expect(hasPermission(user, 'kds')).toBe(true);
    expect(hasPermission(user, 'tables')).toBe(false); // not in explicit list
  });

  it('hasAnyPermission returns true when at least one matches', () => {
    const waiter = makeUser('waiter');
    expect(hasAnyPermission(waiter, ['kds', 'tables'])).toBe(true); // tables matches
  });

  it('hasAnyPermission returns false when none match', () => {
    const bartender = makeUser('bartender');
    expect(hasAnyPermission(bartender, ['tables', 'payments'])).toBe(false);
  });

  it('getDefaultRoute returns /login for null user', () => {
    expect(getDefaultRoute(null)).toBe('/login');
  });

  it('getDefaultRoute returns correct routes per role', () => {
    expect(getDefaultRoute(makeUser('owner'))).toBe('/dashboard');
    expect(getDefaultRoute(makeUser('admin'))).toBe('/dashboard');
    expect(getDefaultRoute(makeUser('waiter'))).toBe('/mesas');
    expect(getDefaultRoute(makeUser('server'))).toBe('/mesas');
    expect(getDefaultRoute(makeUser('cashier'))).toBe('/cobro');
    expect(getDefaultRoute(makeUser('kitchen'))).toBe('/kds');
    expect(getDefaultRoute(makeUser('chef'))).toBe('/kds');
    expect(getDefaultRoute(makeUser('bartender'))).toBe('/kds');
    expect(getDefaultRoute(makeUser('hostess'))).toBe('/reservas');
  });

  it('getDefaultRoute returns /dashboard for unknown role', () => {
    expect(getDefaultRoute(makeUser('unknown'))).toBe('/dashboard');
  });
});
