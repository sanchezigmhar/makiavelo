'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/ui/SearchBar';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Toggle from '@/components/ui/Toggle';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, getInitials, formatDateShort } from '@/lib/utils';
import type { User, Role } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import RequirePermission from '@/components/common/RequirePermission';

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const demoRoles: Role[] = [
    { id: 'r1', name: 'Gerente', slug: 'manager', permissions: ['all'] },
    { id: 'r2', name: 'Mesero', slug: 'waiter', permissions: ['orders', 'tables'] },
    { id: 'r3', name: 'Cocina', slug: 'kitchen', permissions: ['kds'] },
    { id: 'r4', name: 'Bartender', slug: 'bartender', permissions: ['kds', 'orders'] },
    { id: 'r5', name: 'Cajero', slug: 'cashier', permissions: ['payments', 'cash'] },
    { id: 'r6', name: 'Admin', slug: 'admin', permissions: ['all'] },
  ];

  const demoUsers: User[] = [
    { id: 'u1', name: 'Carlos Lopez', email: 'carlos@makiavelo.com', role: demoRoles[0], roleId: 'r1', branchId: '1', isActive: true, createdAt: new Date(Date.now() - 365 * 86400000).toISOString(), updatedAt: '' },
    { id: 'u2', name: 'Maria Garcia', email: 'maria@makiavelo.com', role: demoRoles[1], roleId: 'r2', branchId: '1', isActive: true, createdAt: new Date(Date.now() - 200 * 86400000).toISOString(), updatedAt: '' },
    { id: 'u3', name: 'Pedro Ruiz', email: 'pedro@makiavelo.com', role: demoRoles[2], roleId: 'r3', branchId: '1', isActive: true, createdAt: new Date(Date.now() - 180 * 86400000).toISOString(), updatedAt: '' },
    { id: 'u4', name: 'Ana Torres', email: 'ana@makiavelo.com', role: demoRoles[1], roleId: 'r2', branchId: '1', isActive: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString(), updatedAt: '' },
    { id: 'u5', name: 'Luis Herrera', email: 'luis@makiavelo.com', role: demoRoles[3], roleId: 'r4', branchId: '1', isActive: true, createdAt: new Date(Date.now() - 150 * 86400000).toISOString(), updatedAt: '' },
    { id: 'u6', name: 'Sofia Mendez', email: 'sofia@makiavelo.com', role: demoRoles[4], roleId: 'r5', branchId: '1', isActive: false, createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: '' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, rolesRes] = await Promise.allSettled([
          api.get('/users'),
          api.get('/roles'),
        ]);
        if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data.data || usersRes.value.data);
        else setUsers(demoUsers);
        if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data);
        else setRoles(demoRoles);
      } catch {
        setUsers(demoUsers);
        setRoles(demoRoles);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displayUsers = users.length > 0 ? users : demoUsers;
  const displayRoles = roles.length > 0 ? roles : demoRoles;

  const roleTabs = [
    { id: 'all', label: 'Todos', count: displayUsers.length },
    ...displayRoles.map((r) => ({
      id: r.id,
      label: r.name,
      count: displayUsers.filter((u) => u.roleId === r.id).length,
    })),
  ];

  const filteredUsers = useMemo(() => {
    let result = displayUsers;
    if (selectedRole !== 'all') {
      result = result.filter((u) => u.roleId === selectedRole);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [displayUsers, selectedRole, searchQuery]);

  const roleColors: Record<string, string> = {
    manager: 'bg-maki-gold',
    waiter: 'bg-emerald-500',
    kitchen: 'bg-orange-500',
    bartender: 'bg-purple-500',
    cashier: 'bg-blue-500',
    admin: 'bg-red-500',
  };

  const toggleUserActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
    } catch {
      // demo
    }
    setUsers((prev) =>
      prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u)
    );
    toast.success(user.isActive ? 'Usuario desactivado' : 'Usuario activado');
  };

  return (
    <RequirePermission permission="users">
    <MainLayout>
      <Header
        title="Usuarios"
        subtitle={`${displayUsers.filter((u) => u.isActive).length} activos`}
        actions={
          <Button variant="primary" size="md" icon={<PlusIcon className="w-5 h-5" />}>
            Nuevo Usuario
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 pt-4 pb-2 space-y-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar usuario..." />
          <Tabs tabs={roleTabs} activeTab={selectedRole} onChange={setSelectedRole} variant="pills" size="sm" />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card',
                    !user.isActive && 'opacity-60'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0',
                    roleColors[user.role?.slug || ''] || 'bg-maki-gold'
                  )}>
                    <span className="text-white font-bold text-lg">{getInitials(user.name)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-maki-dark truncate">{user.name}</h3>
                      {!user.isActive && <Badge variant="danger" size="sm">Inactivo</Badge>}
                    </div>
                    <p className="text-sm text-maki-gray truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-maki-gray" />
                      <span className="text-xs text-maki-gray">{user.role?.name || 'Sin rol'}</span>
                      <span className="text-xs text-maki-gray">|</span>
                      <span className="text-xs text-maki-gray">Desde {formatDateShort(user.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle
                      checked={user.isActive}
                      onChange={() => toggleUserActive(user)}
                      size="md"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setSelectedUser(user); setShowDetail(true); }}
                      className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center
                               bg-gray-100 text-maki-gray hover:bg-gray-200 transition-colors touch-manipulation"
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detalle del Usuario"
        size="sm"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="text-center p-6 bg-maki-light rounded-xl">
              <div className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3',
                roleColors[selectedUser.role?.slug || ''] || 'bg-maki-gold'
              )}>
                <span className="text-white font-bold text-2xl">{getInitials(selectedUser.name)}</span>
              </div>
              <h3 className="text-touch-xl font-bold text-maki-dark">{selectedUser.name}</h3>
              <p className="text-maki-gray">{selectedUser.email}</p>
              <Badge variant="default" size="md" className="mt-2">
                <ShieldCheckIcon className="w-4 h-4" />
                {selectedUser.role?.name || 'Sin rol'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-xs text-maki-gray">Estado</p>
                <p className={cn('font-semibold', selectedUser.isActive ? 'text-emerald-600' : 'text-red-600')}>
                  {selectedUser.isActive ? 'Activo' : 'Inactivo'}
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100">
                <p className="text-xs text-maki-gray">Creado</p>
                <p className="font-semibold text-maki-dark">{formatDateShort(selectedUser.createdAt)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" size="lg" fullWidth icon={<KeyIcon className="w-5 h-5" />}>
                Cambiar PIN
              </Button>
              <Button variant="outline" size="lg" fullWidth icon={<PencilSquareIcon className="w-5 h-5" />}>
                Editar Usuario
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
    </RequirePermission>
  );
}
