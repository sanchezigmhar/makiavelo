'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvelopeIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '@/store/auth.store';
import PinPad from '@/components/ui/PinPad';
import Button from '@/components/ui/Button';
import { cn, getInitials } from '@/lib/utils';
import { DEMO_PERMISSIONS, getDefaultRoute } from '@/lib/permissions';
import toast from 'react-hot-toast';
import type { User } from '@/types';

type LoginMode = 'select' | 'pin' | 'email';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithPin, isAuthenticated, isLoading, user: currentUser } = useAuthStore();

  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinError, setPinError] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  // Demo users for when backend is unavailable
  const demoUsers: User[] = [
    { id: '1', name: 'Carlos Lopez', email: 'carlos@makiavelo.com', role: { id: '1', name: 'Gerente', slug: 'manager', permissions: DEMO_PERMISSIONS['manager'] }, roleId: '1', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
    { id: '2', name: 'Maria Garcia', email: 'maria@makiavelo.com', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: DEMO_PERMISSIONS['waiter'] }, roleId: '2', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
    { id: '3', name: 'Pedro Ruiz', email: 'pedro@makiavelo.com', role: { id: '3', name: 'Cocina', slug: 'kitchen', permissions: DEMO_PERMISSIONS['kitchen'] }, roleId: '3', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
    { id: '4', name: 'Ana Torres', email: 'ana@makiavelo.com', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: DEMO_PERMISSIONS['waiter'] }, roleId: '2', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
    { id: '5', name: 'Luis Herrera', email: 'luis@makiavelo.com', role: { id: '4', name: 'Bartender', slug: 'bartender', permissions: DEMO_PERMISSIONS['bartender'] }, roleId: '4', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
    { id: '6', name: 'Sofia Mendez', email: 'sofia@makiavelo.com', role: { id: '5', name: 'Cajero', slug: 'cashier', permissions: DEMO_PERMISSIONS['cashier'] }, roleId: '5', branchId: '1', isActive: true, createdAt: '', updatedAt: '' },
  ];

  useEffect(() => {
    if (isAuthenticated) {
      router.push(getDefaultRoute(currentUser));
    }
  }, [isAuthenticated, router, currentUser]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const fetchedUsers = await useAuthStore.getState().fetchUsers();
        setUsers(fetchedUsers.length > 0 ? fetchedUsers : demoUsers);
      } catch {
        setUsers(demoUsers);
      }
    };
    loadUsers();
  }, []);

  const handlePinComplete = useCallback(
    async (pin: string) => {
      if (!selectedUser) return;
      setPinError('');
      try {
        await loginWithPin(selectedUser.id, pin);
        toast.success(`Bienvenido, ${selectedUser.name.split(' ')[0]}!`);
        // Redirect based on role - use selectedUser since store may not be updated yet
        router.push(getDefaultRoute(selectedUser));
      } catch {
        setPinError('PIN incorrecto. Intenta de nuevo.');
      }
    },
    [selectedUser, loginWithPin, router]
  );

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('Bienvenido!');
      // Redirect based on role from store (updated by login())
      const loggedUser = useAuthStore.getState().user;
      router.push(getDefaultRoute(loggedUser));
    } catch {
      toast.error('Credenciales incorrectas');
    }
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setPinError('');
    setMode('pin');
  };

  // Avatar colors based on role
  const roleColors: Record<string, string> = {
    manager: 'bg-maki-gold',
    waiter: 'bg-emerald-500',
    kitchen: 'bg-orange-500',
    bartender: 'bg-purple-500',
    cashier: 'bg-blue-500',
  };

  return (
    <div className="min-h-screen bg-maki-dark flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, #F5E6C8 0, #F5E6C8 1px, transparent 0, transparent 50%)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-maki-gold/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-maki-green/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-xl px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-maki-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-elevated">
            <span className="text-white font-display font-bold text-3xl">M</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white">Makiavelo</h1>
          <p className="text-maki-cream/50 mt-1">Restaurant Management System</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ===== User Selection Mode ===== */}
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/10">
                <h2 className="text-touch-xl font-bold text-white text-center mb-6">
                  Selecciona tu usuario
                </h2>

                {/* User grid */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {(users.length > 0 ? users : demoUsers).map((user) => (
                    <motion.button
                      key={user.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => selectUser(user)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl
                               bg-white/5 hover:bg-white/10 active:bg-white/15
                               transition-all duration-150 touch-manipulation
                               border border-transparent hover:border-white/10"
                    >
                      <div
                        className={cn(
                          'w-16 h-16 rounded-full flex items-center justify-center text-white',
                          'text-xl font-bold shadow-lg',
                          roleColors[user.role?.slug || ''] || 'bg-maki-gold'
                        )}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white truncate max-w-[100px]">
                          {user.name.split(' ')[0]}
                        </p>
                        <p className="text-xs text-white/40">
                          {user.role?.name || 'Staff'}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Email login toggle */}
                <div className="text-center border-t border-white/10 pt-4">
                  <button
                    onClick={() => setMode('email')}
                    className="text-maki-cream/60 text-sm hover:text-maki-cream transition-colors
                             touch-manipulation min-h-[48px] px-4"
                  >
                    <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                    Iniciar con email y contrasena
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===== PIN Entry Mode ===== */}
          {mode === 'pin' && selectedUser && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                {/* Back button */}
                <button
                  onClick={() => { setMode('select'); setSelectedUser(null); }}
                  className="text-white/60 text-sm hover:text-white transition-colors
                           touch-manipulation min-h-[44px] mb-4 flex items-center gap-1"
                >
                  ← Cambiar usuario
                </button>

                {/* Selected user */}
                <div className="flex flex-col items-center mb-6">
                  <div
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center text-white',
                      'text-2xl font-bold shadow-lg mb-3',
                      roleColors[selectedUser.role?.slug || ''] || 'bg-maki-gold'
                    )}
                  >
                    {getInitials(selectedUser.name)}
                  </div>
                  <p className="text-touch-lg font-bold text-white">
                    {selectedUser.name}
                  </p>
                  <p className="text-sm text-white/40">
                    {selectedUser.role?.name || 'Staff'}
                  </p>
                </div>

                {/* PIN Pad */}
                <PinPad
                  onComplete={handlePinComplete}
                  error={pinError}
                  loading={isLoading}
                  title=""
                  subtitle=""
                />
              </div>
            </motion.div>
          )}

          {/* ===== Email Login Mode ===== */}
          {mode === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
                <button
                  onClick={() => setMode('select')}
                  className="text-white/60 text-sm hover:text-white transition-colors
                           touch-manipulation min-h-[44px] mb-4 flex items-center gap-1"
                >
                  ← Acceso rapido con PIN
                </button>

                <h2 className="text-touch-xl font-bold text-white text-center mb-6">
                  Iniciar Sesion
                </h2>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Email</label>
                    <div className="relative">
                      <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@makiavelo.com"
                        className="w-full min-h-[52px] pl-12 pr-4 rounded-xl bg-white/10 border border-white/10
                                 text-white placeholder:text-white/30 text-touch-base
                                 focus:outline-none focus:ring-2 focus:ring-maki-gold/50 focus:border-maki-gold/50
                                 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-white/60 mb-1.5">Contrasena</label>
                    <div className="relative">
                      <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contrasena"
                        className="w-full min-h-[52px] pl-12 pr-4 rounded-xl bg-white/10 border border-white/10
                                 text-white placeholder:text-white/30 text-touch-base
                                 focus:outline-none focus:ring-2 focus:ring-maki-gold/50 focus:border-maki-gold/50
                                 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={isLoading}
                    className="mt-6"
                  >
                    Iniciar Sesion
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p className="text-center text-white/20 text-xs mt-8">
          MakiCore v1.0 - Makiavelo Restaurant System
        </p>
      </div>
    </div>
  );
}
