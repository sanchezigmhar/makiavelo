'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  TableCellsIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  FireIcon,
  CubeIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  UsersIcon,
  ChartBarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { hasPermission, type Permission } from '@/lib/permissions';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
  permission: Permission;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Inicio', icon: HomeIcon, path: '/dashboard', section: 'principal', permission: 'dashboard' },
  { id: 'mesas', label: 'Mesas', icon: TableCellsIcon, path: '/mesas', section: 'principal', permission: 'tables' },
  { id: 'pedidos', label: 'Pedidos', icon: ClipboardDocumentListIcon, path: '/pedidos', section: 'principal', permission: 'orders' },
  { id: 'cobro', label: 'Cobro', icon: CreditCardIcon, path: '/cobro', section: 'principal', permission: 'payments' },
  { id: 'kds', label: 'Cocina', icon: FireIcon, path: '/kds', section: 'principal', permission: 'kds' },
  { id: 'productos', label: 'Productos', icon: CubeIcon, path: '/productos', section: 'gestion', permission: 'products' },
  { id: 'inventario', label: 'Inventario', icon: ArchiveBoxIcon, path: '/inventario', section: 'gestion', permission: 'inventory' },
  { id: 'reservas', label: 'Reservas', icon: CalendarDaysIcon, path: '/reservas', section: 'gestion', permission: 'reservations' },
  { id: 'clientes', label: 'Clientes', icon: UsersIcon, path: '/clientes', section: 'gestion', permission: 'customers' },
  { id: 'reportes', label: 'Reportes', icon: ChartBarIcon, path: '/reportes', section: 'admin', permission: 'reports' },
  { id: 'usuarios', label: 'Usuarios', icon: UserGroupIcon, path: '/usuarios', section: 'admin', permission: 'users' },
  { id: 'configuracion', label: 'Config', icon: Cog6ToothIcon, path: '/configuracion', section: 'admin', permission: 'settings' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filter nav items based on user permissions
  const visibleItems = navItems.filter((item) => hasPermission(user, item.permission));
  const principalItems = visibleItems.filter((i) => i.section === 'principal');
  const gestionItems = visibleItems.filter((i) => i.section === 'gestion');
  const adminItems = visibleItems.filter((i) => i.section === 'admin');

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="h-full bg-maki-dark flex flex-col overflow-hidden flex-shrink-0"
    >
      {/* Logo / Header */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 bg-maki-gold rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">M</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <h1 className="text-white font-display font-bold text-lg whitespace-nowrap">
                Makiavelo
              </h1>
              <p className="text-white/40 text-xs whitespace-nowrap">Restaurant System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {/* Principal section */}
        {principalItems.length > 0 && (
          <div className="px-3 mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                Principal
              </p>
            )}
            {principalItems.map((item) => {
              const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full min-h-[48px] rounded-xl flex items-center gap-3 px-3 mb-1',
                    'transition-all duration-150 touch-manipulation',
                    isActive
                      ? 'bg-maki-gold text-white shadow-card'
                      : 'text-white/60 hover:bg-white/5 hover:text-white active:bg-white/10'
                  )}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium text-touch-base whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Gestion section */}
        {gestionItems.length > 0 && (
          <div className="px-3 mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                Gestion
              </p>
            )}
            {gestionItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full min-h-[48px] rounded-xl flex items-center gap-3 px-3 mb-1',
                    'transition-all duration-150 touch-manipulation',
                    isActive
                      ? 'bg-maki-gold text-white shadow-card'
                      : 'text-white/60 hover:bg-white/5 hover:text-white active:bg-white/10'
                  )}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium text-touch-base whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Admin section */}
        {adminItems.length > 0 && (
          <div className="px-3">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
                Admin
              </p>
            )}
            {adminItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigate(item.path)}
                  className={cn(
                    'w-full min-h-[48px] rounded-xl flex items-center gap-3 px-3 mb-1',
                    'transition-all duration-150 touch-manipulation',
                    isActive
                      ? 'bg-maki-gold text-white shadow-card'
                      : 'text-white/60 hover:bg-white/5 hover:text-white active:bg-white/10'
                  )}
                >
                  <item.icon className="w-6 h-6 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium text-touch-base whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 min-h-[40px] rounded-xl flex items-center justify-center gap-2
                   text-white/40 hover:text-white hover:bg-white/5 transition-all touch-manipulation"
      >
        {collapsed ? (
          <ChevronRightIcon className="w-5 h-5" />
        ) : (
          <>
            <ChevronLeftIcon className="w-5 h-5" />
            <span className="text-sm">Colapsar</span>
          </>
        )}
      </button>

      {/* User / Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full min-h-[48px] rounded-xl flex items-center gap-3 px-3',
            'text-white/60 hover:bg-red-500/20 hover:text-red-300 active:bg-red-500/30',
            'transition-all duration-150 touch-manipulation'
          )}
        >
          <ArrowRightStartOnRectangleIcon className="w-6 h-6 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-medium text-touch-base whitespace-nowrap"
              >
                Salir
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
