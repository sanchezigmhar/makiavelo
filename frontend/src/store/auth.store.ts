import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Branch } from '@/types';
import api from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { DEMO_PERMISSIONS } from '@/lib/permissions';

// Helper to map backend user (firstName/lastName) to frontend User (name)
function mapBackendUser(backendUser: any): User { // eslint-disable-line
  const name = backendUser.name || `${backendUser.firstName || ''} ${backendUser.lastName || ''}`.trim() || backendUser.email;
  const role = backendUser.role ? {
    id: backendUser.role.id,
    name: backendUser.role.displayName || backendUser.role.name,
    slug: backendUser.role.name, // backend role.name is the slug (e.g. 'admin', 'server')
    permissions: backendUser.role.permissions ? Object.keys(backendUser.role.permissions) : [],
  } : { id: '', name: 'Staff', slug: 'staff', permissions: [] };

  return {
    id: backendUser.id,
    email: backendUser.email,
    name,
    avatarUrl: backendUser.avatarUrl,
    role,
    roleId: backendUser.roleId,
    branchId: backendUser.branchId,
    branch: backendUser.branch,
    isActive: backendUser.isActive,
    createdAt: backendUser.createdAt,
    updatedAt: backendUser.updatedAt,
  };
}

// Demo data for when backend is unavailable
const demoBranch: Branch = {
  id: 'branch-1',
  name: 'Makiavelo Principal',
  address: 'Calle 50, Panama City',
  phone: '+507 6000-0000',
  currency: 'USD',
  timezone: 'America/Panama',
  isActive: true,
};

const demoUsers: Record<string, User> = {
  '1': { id: '1', name: 'Carlos Lopez', email: 'carlos@makiavelo.com', role: { id: '1', name: 'Gerente', slug: 'manager', permissions: DEMO_PERMISSIONS['manager'] }, roleId: '1', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
  '2': { id: '2', name: 'Maria Garcia', email: 'maria@makiavelo.com', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: DEMO_PERMISSIONS['waiter'] }, roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
  '3': { id: '3', name: 'Pedro Ruiz', email: 'pedro@makiavelo.com', role: { id: '3', name: 'Cocina', slug: 'kitchen', permissions: DEMO_PERMISSIONS['kitchen'] }, roleId: '3', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
  '4': { id: '4', name: 'Ana Torres', email: 'ana@makiavelo.com', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: DEMO_PERMISSIONS['waiter'] }, roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
  '5': { id: '5', name: 'Luis Herrera', email: 'luis@makiavelo.com', role: { id: '4', name: 'Bartender', slug: 'bartender', permissions: DEMO_PERMISSIONS['bartender'] }, roleId: '4', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
  '6': { id: '6', name: 'Sofia Mendez', email: 'sofia@makiavelo.com', role: { id: '5', name: 'Cajero', slug: 'cashier', permissions: DEMO_PERMISSIONS['cashier'] }, roleId: '5', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '' },
};

// Demo PINs per user (when backend is offline)
const demoPins: Record<string, string> = {
  '1': '1111', // Carlos - Gerente
  '2': '2222', // Maria - Mesero
  '3': '3333', // Pedro - Cocina
  '4': '4444', // Ana - Mesero
  '5': '5555', // Luis - Bartender
  '6': '6666', // Sofia - Cajero
};

interface AuthState {
  user: User | null;
  token: string | null;
  branch: Branch | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  _hasHydrated: boolean;

  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (userId: string, pin: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setBranch: (branch: Branch) => void;
  setOnline: (status: boolean) => void;
  fetchUsers: () => Promise<User[]>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      branch: null,
      isAuthenticated: false,
      isLoading: false,
      isOnline: true,
      _hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { accessToken, user: rawUser } = data;
          const user = mapBackendUser(rawUser);

          localStorage.setItem('maki_token', accessToken);
          if (user.branchId) {
            localStorage.setItem('maki_branch_id', user.branchId);
          }

          try { connectSocket(accessToken, user.branchId); } catch {}

          set({
            user,
            token: accessToken,
            branch: rawUser.branch || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Demo fallback: accept admin@makiavelo.com / admin123
          if (email === 'admin@makiavelo.com' && password === 'admin123') {
            const demoUser = demoUsers['1'];
            const demoToken = 'demo-token-makicore';
            localStorage.setItem('maki_token', demoToken);
            localStorage.setItem('maki_branch_id', 'branch-1');
            set({
              user: demoUser,
              token: demoToken,
              branch: demoBranch,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
          set({ isLoading: false });
          throw new Error('Credenciales incorrectas');
        }
      },

      loginWithPin: async (userId: string, pin: string) => {
        set({ isLoading: true });
        try {
          // Backend endpoint is /auth/login/pin and only needs { pin }
          const { data } = await api.post('/auth/login/pin', { pin });
          const { accessToken, user: rawUser } = data;
          const user = mapBackendUser(rawUser);

          localStorage.setItem('maki_token', accessToken);
          if (user.branchId) {
            localStorage.setItem('maki_branch_id', user.branchId);
          }

          try { connectSocket(accessToken, user.branchId); } catch {}

          set({
            user,
            token: accessToken,
            branch: rawUser.branch || null,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          // Demo fallback: accept individual PINs per user
          const demoUser = demoUsers[userId];
          const expectedPin = demoPins[userId];
          if (demoUser && expectedPin && pin === expectedPin) {
            const demoToken = 'demo-token-makicore';
            localStorage.setItem('maki_token', demoToken);
            localStorage.setItem('maki_branch_id', 'branch-1');
            set({
              user: demoUser,
              token: demoToken,
              branch: demoBranch,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
          set({ isLoading: false });
          throw new Error('PIN incorrecto');
        }
      },

      logout: () => {
        localStorage.removeItem('maki_token');
        localStorage.removeItem('maki_branch_id');
        localStorage.removeItem('maki_user');
        localStorage.removeItem('maki-auth'); // Clear persisted zustand state
        try { disconnectSocket(); } catch {}
        set({
          user: null,
          token: null,
          branch: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User) => set({ user }),
      setBranch: (branch: Branch) => {
        localStorage.setItem('maki_branch_id', branch.id);
        set({ branch });
      },
      setOnline: (status: boolean) => set({ isOnline: status }),

      fetchUsers: async () => {
        try {
          const { data } = await api.get('/users');
          // Map backend users (firstName/lastName) to frontend User format
          const users = Array.isArray(data) ? data.map(mapBackendUser) : [];
          return users;
        } catch {
          return [];
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('maki_token');
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }
        // Demo token - stay authenticated
        if (token === 'demo-token-makicore') {
          return;
        }
        try {
          const { data } = await api.get('/auth/me');
          const user = mapBackendUser(data);
          set({ user, isAuthenticated: true, token });
          try { connectSocket(token, user.branchId); } catch {}
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'maki-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        branch: state.branch,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
        }
      },
    }
  )
);
