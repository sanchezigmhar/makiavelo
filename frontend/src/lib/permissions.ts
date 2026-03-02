import type { User } from '@/types';

// Permission keys that map to route access
export type Permission =
  | 'dashboard'
  | 'tables'
  | 'orders'
  | 'payments'
  | 'kds'
  | 'products'
  | 'inventory'
  | 'reservations'
  | 'customers'
  | 'reports'
  | 'users'
  | 'settings'
  | 'all'; // owner/admin see everything

// Map route paths to the permission required to access them
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'dashboard',
  '/mesas': 'tables',
  '/pedidos': 'orders',
  '/cobro': 'payments',
  '/kds': 'kds',
  '/productos': 'products',
  '/inventario': 'inventory',
  '/reservas': 'reservations',
  '/clientes': 'customers',
  '/reportes': 'reports',
  '/usuarios': 'users',
  '/configuracion': 'settings',
};

// Default landing page per role slug
export const DEFAULT_ROUTES: Record<string, string> = {
  owner: '/dashboard',
  admin: '/dashboard',
  cashier: '/cobro',
  server: '/mesas',
  chef: '/kds',
  hostess: '/reservas',
  bartender: '/kds',
  // Demo slugs (mapped from previous code)
  manager: '/dashboard',
  waiter: '/mesas',
  kitchen: '/kds',
};

// Permissions granted to each demo role slug
// Logica de negocio restaurante:
// - Cocinero: solo ve su pantalla KDS y el inventario (stock)
// - Mesero: maneja mesas, crea pedidos, ve menu (productos)
// - Bartender: solo ve su pantalla KDS (pedidos de bar)
// - Cajero: cobra pedidos, ve pedidos y productos (precios), clientes
// - Hostess: maneja reservas y clientes
export const DEMO_PERMISSIONS: Record<string, Permission[]> = {
  // Owner/Admin — acceso total
  owner: ['all'],
  admin: ['all'],
  manager: ['all'],
  // Cajero — cobra, ve pedidos/productos/clientes
  cashier: ['orders', 'payments', 'customers', 'products'],
  // Mesero — atiende mesas, crea pedidos, ve menu
  server: ['tables', 'orders', 'products'],
  waiter: ['tables', 'orders', 'products'],
  // Cocinero — solo su pantalla KDS y consulta de inventario
  chef: ['kds', 'inventory'],
  kitchen: ['kds', 'inventory'],
  // Hostess — reservas y clientes
  hostess: ['reservations', 'customers'],
  // Bartender — solo su pantalla KDS
  bartender: ['kds'],
};

/**
 * Get the effective permissions for a user.
 * Uses the user's role permissions if available, otherwise falls back
 * to DEMO_PERMISSIONS based on the role slug. This ensures permissions
 * work even with persisted sessions that have stale/empty permissions.
 */
function getEffectivePermissions(user: User): string[] {
  const slug = user.role?.slug || '';
  const userPerms = user.role?.permissions || [];

  // If user has explicit permissions, use them
  if (userPerms.length > 0) {
    return userPerms;
  }

  // Fallback to DEMO_PERMISSIONS based on role slug
  return DEMO_PERMISSIONS[slug] || [];
}

/**
 * Check if a user has a specific permission.
 * Owner/admin roles or users with 'all' permission have access to everything.
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;

  const slug = user.role?.slug || '';

  // Owner and admin roles always have full access
  if (slug === 'owner' || slug === 'admin' || slug === 'manager') {
    return true;
  }

  const permissions = getEffectivePermissions(user);

  // Check for 'all' permission
  if (permissions.includes('all')) {
    return true;
  }

  // Check specific permission
  return permissions.includes(permission);
}

/**
 * Check if a user has at least one of the given permissions.
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}

/**
 * Get the default route for a user based on their role.
 */
export function getDefaultRoute(user: User | null): string {
  if (!user) return '/login';
  const slug = user.role?.slug || '';
  return DEFAULT_ROUTES[slug] || '/dashboard';
}
