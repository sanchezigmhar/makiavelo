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

// Demo order items for occupied tables
const demoItems = {
  o1: [
    { id: 'di1', orderId: 'o1', productId: 'p1', name: 'Ceviche Nikkei', quantity: 2, unitPrice: 16, totalPrice: 32, courseType: 'ENTRADA' as const, status: 'PREPARING' as const, sortOrder: 0 },
    { id: 'di2', orderId: 'o1', productId: 'p2', name: 'Lomo Saltado', quantity: 1, unitPrice: 22, totalPrice: 22, courseType: 'PLATO_FUERTE' as const, status: 'PENDING' as const, sortOrder: 1 },
    { id: 'di3', orderId: 'o1', productId: 'p7', name: 'Pisco Sour', quantity: 2, unitPrice: 7.25, totalPrice: 14.50, courseType: 'BEBIDA' as const, status: 'READY' as const, sortOrder: 2 },
  ],
  o2: [
    { id: 'di4', orderId: 'o2', productId: 'p3', name: 'Tiradito de Salmón', quantity: 1, unitPrice: 18, totalPrice: 18, courseType: 'ENTRADA' as const, status: 'DELIVERED' as const, sortOrder: 0 },
    { id: 'di5', orderId: 'o2', productId: 'p4', name: 'Arroz con Mariscos', quantity: 2, unitPrice: 26, totalPrice: 52, courseType: 'PLATO_FUERTE' as const, status: 'PREPARING' as const, sortOrder: 1 },
    { id: 'di6', orderId: 'o2', productId: 'p5', name: 'Causa Limeña', quantity: 1, unitPrice: 14, totalPrice: 14, courseType: 'ENTRADA' as const, status: 'READY' as const, sortOrder: 2 },
    { id: 'di7', orderId: 'o2', productId: 'p8', name: 'Chicha Morada', quantity: 3, unitPrice: 5, totalPrice: 15, courseType: 'BEBIDA' as const, status: 'DELIVERED' as const, sortOrder: 3 },
  ],
  o3: [
    { id: 'di8', orderId: 'o3', productId: 'p6', name: 'Anticuchos', quantity: 1, unitPrice: 15, totalPrice: 15, courseType: 'ENTRADA' as const, status: 'PREPARING' as const, sortOrder: 0 },
    { id: 'di9', orderId: 'o3', productId: 'p9', name: 'Inca Kola', quantity: 2, unitPrice: 4, totalPrice: 8, courseType: 'BEBIDA' as const, status: 'DELIVERED' as const, sortOrder: 1 },
  ],
  o4: [
    { id: 'di10', orderId: 'o4', productId: 'p1', name: 'Ceviche Nikkei', quantity: 1, unitPrice: 16, totalPrice: 16, courseType: 'ENTRADA' as const, status: 'DELIVERED' as const, sortOrder: 0 },
    { id: 'di11', orderId: 'o4', productId: 'p10', name: 'Ají de Gallina', quantity: 2, unitPrice: 20, totalPrice: 40, courseType: 'PLATO_FUERTE' as const, status: 'PREPARING' as const, sortOrder: 1 },
    { id: 'di12', orderId: 'o4', productId: 'p7', name: 'Pisco Sour', quantity: 3, unitPrice: 7.25, totalPrice: 21.75, courseType: 'BEBIDA' as const, status: 'DELIVERED' as const, sortOrder: 2 },
  ],
  o5: [
    { id: 'di13', orderId: 'o5', productId: 'p11', name: 'Mojito Clásico', quantity: 2, unitPrice: 9, totalPrice: 18, courseType: 'BEBIDA' as const, status: 'DELIVERED' as const, sortOrder: 0 },
    { id: 'di14', orderId: 'o5', productId: 'p12', name: 'Nachos con Guacamole', quantity: 1, unitPrice: 10, totalPrice: 10, courseType: 'ENTRADA' as const, status: 'READY' as const, sortOrder: 1 },
  ],
};

// Demo tables - ALL capacity 2, round shape (user merges/splits as needed)
const demoTables: Table[] = [
  // Salón Principal - 18 mesas (all 2-person round)
  { id: 't1', number: 1, name: 'Mesa 1', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 100 },
  { id: 't2', number: 2, name: 'Mesa 2', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 100 },
  { id: 't3', number: 3, name: 'Mesa 3', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'OCCUPIED', isActive: true, shape: 'round', posX: 320, posY: 100, occupiedAt: new Date(Date.now() - 45 * 60000).toISOString(), assignedUser: { id: 'u1', name: 'Carlos Lopez', email: '', roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: [] } }, currentOrder: { id: 'o1', orderNumber: '142', total: 68.50, items: demoItems.o1, subtotal: 58.50, taxAmount: 5.85, discountAmount: 0, tipAmount: 4.15, type: 'DINE_IN' as const, status: 'IN_PROGRESS' as const, userId: 'u1', branchId: 'branch-1', createdAt: '', updatedAt: '' } },
  { id: 't4', number: 4, name: 'Mesa 4', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 100 },
  { id: 't5', number: 5, name: 'Mesa 5', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 560, posY: 100 },
  { id: 't6', number: 6, name: 'Mesa 6', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 240 },
  { id: 't7', number: 7, name: 'Mesa 7', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'OCCUPIED', isActive: true, shape: 'round', posX: 200, posY: 240, occupiedAt: new Date(Date.now() - 22 * 60000).toISOString(), assignedUser: { id: 'u2', name: 'Maria Garcia', email: '', roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: [] } }, currentOrder: { id: 'o2', orderNumber: '145', total: 124.00, items: demoItems.o2, subtotal: 105.00, taxAmount: 10.50, discountAmount: 0, tipAmount: 8.50, type: 'DINE_IN' as const, status: 'IN_PROGRESS' as const, userId: 'u2', branchId: 'branch-1', createdAt: '', updatedAt: '' } },
  { id: 't8', number: 8, name: 'Mesa 8', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 240 },
  { id: 't9', number: 9, name: 'Mesa 9', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 240 },
  { id: 't10', number: 10, name: 'Mesa 10', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'CLEANING', isActive: true, shape: 'round', posX: 560, posY: 240 },
  { id: 't11', number: 11, name: 'Mesa 11', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 380 },
  { id: 't12', number: 12, name: 'Mesa 12', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 380 },
  { id: 't13', number: 13, name: 'Mesa 13', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'RESERVED', isActive: true, shape: 'round', posX: 320, posY: 380 },
  { id: 't14', number: 14, name: 'Mesa 14', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 440, posY: 380 },
  { id: 't15', number: 15, name: 'Mesa 15', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 560, posY: 380 },
  { id: 't16', number: 16, name: 'Mesa 16', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 80, posY: 520 },
  { id: 't17', number: 17, name: 'Mesa 17', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 200, posY: 520 },
  { id: 't18', number: 18, name: 'Mesa 18', zoneId: 'salon', zone: demoZones[0], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 320, posY: 520 },

  // Terraza - 10 mesas (all 2-person round)
  { id: 't19', number: 19, name: 'Mesa 19', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 100 },
  { id: 't20', number: 20, name: 'Mesa 20', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'OCCUPIED', isActive: true, shape: 'round', posX: 900, posY: 100, occupiedAt: new Date(Date.now() - 55 * 60000).toISOString(), assignedUser: { id: 'u4', name: 'Ana Torres', email: '', roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: [] } }, currentOrder: { id: 'o4', orderNumber: '138', total: 95.00, items: demoItems.o4, subtotal: 80.00, taxAmount: 8.00, discountAmount: 0, tipAmount: 7.00, type: 'DINE_IN' as const, status: 'IN_PROGRESS' as const, userId: 'u4', branchId: 'branch-1', createdAt: '', updatedAt: '' } },
  { id: 't21', number: 21, name: 'Mesa 21', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 100 },
  { id: 't22', number: 22, name: 'Mesa 22', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 100 },
  { id: 't23', number: 23, name: 'Mesa 23', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 240 },
  { id: 't24', number: 24, name: 'Mesa 24', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'RESERVED', isActive: true, shape: 'round', posX: 900, posY: 240 },
  { id: 't25', number: 25, name: 'Mesa 25', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 240 },
  { id: 't26', number: 26, name: 'Mesa 26', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 240 },
  { id: 't27', number: 27, name: 'Mesa 27', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 380 },
  { id: 't28', number: 28, name: 'Mesa 28', zoneId: 'terraza', zone: demoZones[1], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 380 },

  // Bar - 5 asientos (bar shape, all 2-person)
  { id: 't29', number: 29, name: 'Barra 1', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'OCCUPIED', isActive: true, shape: 'bar', posX: 80, posY: 700, occupiedAt: new Date(Date.now() - 15 * 60000).toISOString(), assignedUser: { id: 'u5', name: 'Luis Herrera', email: '', roleId: '4', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '', role: { id: '4', name: 'Bartender', slug: 'bartender', permissions: [] } }, currentOrder: { id: 'o5', orderNumber: '147', total: 28.00, items: demoItems.o5, subtotal: 24.00, taxAmount: 2.40, discountAmount: 0, tipAmount: 1.60, type: 'DINE_IN' as const, status: 'IN_PROGRESS' as const, userId: 'u5', branchId: 'branch-1', createdAt: '', updatedAt: '' } },
  { id: 't30', number: 30, name: 'Barra 2', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 260, posY: 700 },
  { id: 't31', number: 31, name: 'Barra 3', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'OCCUPIED', isActive: true, shape: 'round', posX: 440, posY: 700, occupiedAt: new Date(Date.now() - 8 * 60000).toISOString(), assignedUser: { id: 'u1', name: 'Carlos Lopez', email: '', roleId: '2', branchId: 'branch-1', isActive: true, createdAt: '', updatedAt: '', role: { id: '2', name: 'Mesero', slug: 'waiter', permissions: [] } }, currentOrder: { id: 'o3', orderNumber: '148', total: 36.00, items: demoItems.o3, subtotal: 30.50, taxAmount: 3.05, discountAmount: 0, tipAmount: 2.45, type: 'DINE_IN' as const, status: 'IN_PROGRESS' as const, userId: 'u1', branchId: 'branch-1', createdAt: '', updatedAt: '' } },
  { id: 't32', number: 32, name: 'Barra 4', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'bar', posX: 620, posY: 700 },
  { id: 't33', number: 33, name: 'Barra 5', zoneId: 'bar', zone: demoZones[2], capacity: 2, status: 'BLOCKED', isActive: true, shape: 'bar', posX: 800, posY: 700 },

  // VIP - 6 mesas (all 2-person round)
  { id: 't34', number: 34, name: 'VIP 1', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 780, posY: 540 },
  { id: 't35', number: 35, name: 'VIP 2', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 900, posY: 540 },
  { id: 't36', number: 36, name: 'VIP 3', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1020, posY: 540 },
  { id: 't37', number: 37, name: 'VIP 4', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'AVAILABLE', isActive: true, shape: 'round', posX: 1140, posY: 540 },
  { id: 't38', number: 38, name: 'VIP 5', zoneId: 'vip', zone: demoZones[3], capacity: 2, status: 'RESERVED', isActive: true, shape: 'round', posX: 880, posY: 660 },
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
