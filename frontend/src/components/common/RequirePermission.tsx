'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission, getDefaultRoute, type Permission } from '@/lib/permissions';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
}

/**
 * Wraps a page to enforce permission-based access.
 * If the current user lacks the required permission,
 * they are redirected to their role's default route.
 */
export default function RequirePermission({ permission, children }: RequirePermissionProps) {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const allowed = isAuthenticated && hasPermission(user, permission);

  useEffect(() => {
    if (!_hasHydrated) return; // Wait for Zustand to rehydrate from localStorage
    if (isAuthenticated && !allowed) {
      router.replace(getDefaultRoute(user));
    }
  }, [_hasHydrated, isAuthenticated, allowed, user, router]);

  // Show nothing while hydrating or if not allowed
  if (!_hasHydrated || !allowed) return null;

  return <>{children}</>;
}
