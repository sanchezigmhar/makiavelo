import { create } from 'zustand';
import type { Table, Zone, TableStatus } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// Demo zones
const demoZones: Zone[] = [
  { id: 'salon', name: 'Salón Principal', branchId: 'branch-1', sortOrder: 1, isActive: true },
  { id: 'terraza', name: 'Terraza', branchId: 'branch-1', sortOrder: 2, isActive: true },
  { id: 'bar', name: 'Bar', branchId: 'branch-1', sortOrder: 3, isActive: true },
  { id: 'vip', name: 'VIP', branchId: 'branch-1', sortOrder: 4, isActive: true },
];

// No demo order items — tables start clean

// Demo tables - ALL capacity 2, round shape, ALL AVAILABLE (clean start)
const demoTables: Table[] = [
  // Salón Principal - 18 mesas
  { id: 't1', number: 1, name: 'Mesa 1', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 100 },
  { id: 't2', number: 2, name: 'Mesa 2', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 100 },
  { id: 't3', number: 3, name: 'Mesa 3', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 100 },
  { id: 't4', number: 4, name: 'Mesa 4', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 100 },
  { id: 't5', number: 5, name: 'Mesa 5', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 560, posY: 100 },
  { id: 't6', number: 6, name: 'Mesa 6', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 240 },
  { id: 't7', number: 7, name: 'Mesa 7', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 240 },
  { id: 't8', number: 8, name: 'Mesa 8', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 240 },
  { id: 't9', number: 9, name: 'Mesa 9', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 240 },
  { id: 't10', number: 10, name: 'Mesa 10', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 560, posY: 240 },
  { id: 't11', number: 11, name: 'Mesa 11', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 380 },
  { id: 't12', number: 12, name: 'Mesa 12', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 380 },
  { id: 't13', number: 13, name: 'Mesa 13', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 380 },
  { id: 't14', number: 14, name: 'Mesa 14', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 380 },
  { id: 't15', number: 15, name: 'Mesa 15', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 560, posY: 380 },
  { id: 't16', number: 16, name: 'Mesa 16', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 520 },
  { id: 't17', number: 17, name: 'Mesa 17', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 520 },
  { id: 't18', number: 18, name: 'Mesa 18', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 520 },

  // Terraza - 10 mesas
  { id: 't19', number: 19, name: 'Mesa 19', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 100 },
  { id: 't20', number: 20, name: 'Mesa 20', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 100 },
  { id: 't21', number: 21, name: 'Mesa 21', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 100 },
  { id: 't22', number: 22, name: 'Mesa 22', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 100 },
  { id: 't23', number: 23, name: 'Mesa 23', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 240 },
  { id: 't24', number: 24, name: 'Mesa 24', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 240 },
  { id: 't25', number: 25, name: 'Mesa 25', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 240 },
  { id: 't26', number: 26, name: 'Mesa 26', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 240 },
  { id: 't27', number: 27, name: 'Mesa 27', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 380 },
  { id: 't28', number: 28, name: 'Mesa 28', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 380 },

  // Bar - 5 asientos
  { id: 't29', number: 29, name: 'Barra 1', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 80, posY: 700 },
  { id: 't30', number: 30, name: 'Barra 2', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 260, posY: 700 },
  { id: 't31', number: 31, name: 'Barra 3', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 700 },
  { id: 't32', number: 32, name: 'Barra 4', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 620, posY: 700 },
  { id: 't33', number: 33, name: 'Barra 5', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 800, posY: 700 },

  // VIP - 6 mesas
  { id: 't34', number: 34, name: 'VIP 1', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 540 },
  { id: 't35', number: 35, name: 'VIP 2', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 540 },
  { id: 't36', number: 36, name: 'VIP 3', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 540 },
  { id: 't37', number: 37, name: 'VIP 4', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 540 },
  { id: 't38', number: 38, name: 'VIP 5', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 880, posY: 660 },
  { id: 't39', number: 39, name: 'VIP 6', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1000, posY: 660 },
];

interface TablesState {
  tables: Table[];
  zones: Zone[];
  selectedZone: string | null;
  isLoading: boolean;

  fetchTables: () => Promise<void>;
  fetchZones: () => Promise<void>;
  updateTableStatus: (tableId: string, status: TableStatus) => Promise<void>;
  assignTable: (tableId: string, userId: string) => Promise<void>;
  setSelectedZone: (zoneId: string | null) => void;
  getFilteredTables: () => Table[];
  getTableById: (id: string) => Table | undefined;
  updateTableLocally: (table: Table) => void;
  updateTablePosition: (tableId: string, posX: number, posY: number) => void;
}

export const useTablesStore = create<TablesState>((set, get) => ({
  tables: [],
  zones: [],
  selectedZone: null,
  isLoading: false,

  fetchTables: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Table[]>('/tables');
      const arr = Array.isArray(data) ? data : [];
      console.log('[TABLES_STORE] fetchTables: got', arr.length, 'tables from backend');
      if (arr.length > 0) {
        // Map backend fields to frontend format
        const mapped = arr.map((t: any) => { // eslint-disable-line
          // Backend sends orders[] array (active orders), map to currentOrder/currentOrderId
          const activeOrder = t.orders && t.orders.length > 0 ? t.orders[0] : undefined;
          if (activeOrder) {
            console.log(`[TABLES_STORE]   Table #${t.number}: OCCUPIED, order #${activeOrder.orderNumber} items=${activeOrder.items?.length}`);
          }
          return {
            ...t,
            capacity: t.seats ?? t.capacity ?? 2,
            name: t.name || `Mesa ${t.number}`,
            currentOrderId: activeOrder?.id ?? t.currentOrderId,
            currentOrder: activeOrder ?? t.currentOrder,
            occupiedAt: activeOrder?.openedAt ?? activeOrder?.createdAt ?? t.occupiedAt,
            assignedUser: activeOrder?.user ?? t.assignedUser,
          };
        }) as Table[];
        set({ tables: mapped, isLoading: false });
      } else {
        console.log('[TABLES_STORE] fetchTables: empty response, using demo data');
        set({ tables: demoTables, isLoading: false });
      }
    } catch (err) {
      console.log('[TABLES_STORE] fetchTables error (using demo data):', err);
      // Use demo data when backend is unavailable
      if (get().tables.length === 0) {
        set({ tables: demoTables });
      }
      set({ isLoading: false });
    }
  },

  fetchZones: async () => {
    try {
      const { data } = await api.get<Zone[]>('/zones');
      if (data && Array.isArray(data) && data.length > 0) {
        set({ zones: data });
      } else {
        set({ zones: demoZones });
      }
    } catch {
      if (get().zones.length === 0) {
        set({ zones: demoZones });
      }
    }
  },

  updateTableStatus: async (tableId: string, status: TableStatus) => {
    try {
      const { data } = await api.patch<Table>(`/tables/${tableId}/status`, { status });
      set((state) => ({
        tables: state.tables.map((t) => (t.id === tableId ? data : t)),
      }));
    } catch {
      // Demo mode - update locally
      set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status,
                occupiedAt: status === 'OCCUPIED' ? new Date().toISOString() : undefined,
                currentOrder: status === 'AVAILABLE' ? undefined : t.currentOrder,
                assignedUser: status === 'AVAILABLE' ? undefined : t.assignedUser,
              }
            : t
        ),
      }));
    }
    toast.success('Estado actualizado');
  },

  assignTable: async (tableId: string, userId: string) => {
    try {
      const { data } = await api.patch<Table>(`/tables/${tableId}/assign`, { userId });
      set((state) => ({
        tables: state.tables.map((t) => (t.id === tableId ? data : t)),
      }));
    } catch {
      // Demo mode
    }
  },

  setSelectedZone: (zoneId) => set({ selectedZone: zoneId }),

  getFilteredTables: () => {
    const { tables, selectedZone } = get();
    if (!selectedZone) return tables;
    return tables.filter((t) => t.zoneId === selectedZone);
  },

  getTableById: (id) => get().tables.find((t) => t.id === id),

  updateTableLocally: (table) => {
    set((state) => ({
      tables: state.tables.map((t) => (t.id === table.id ? table : t)),
    }));
  },

  updateTablePosition: (tableId: string, posX: number, posY: number) => {
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, posX, posY } : t
      ),
    }));
  },
}));
