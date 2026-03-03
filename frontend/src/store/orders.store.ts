import { create } from 'zustand';
import type { Order, OrderStatus, OrderItem, PaginatedResponse } from '@/types';
import api, { normalizeOrder, normalizeOrders } from '@/lib/api';
import toast from 'react-hot-toast';

// Demo order number counter
let demoOrderCounter = 150;

// ============================================================
// Demo order persistence helpers
// ============================================================
const DEMO_ORDERS_KEY = 'makiavelo-demo-orders';

function saveDemoOrders(orders: Order[]) {
  try {
    const demoOnly = orders.filter((o) => o.id?.startsWith('demo_'));
    if (demoOnly.length > 0) {
      localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(demoOnly));
    } else {
      localStorage.removeItem(DEMO_ORDERS_KEY);
    }
  } catch { /* */ }
}

function loadDemoOrders(): Order[] {
  try {
    const stored = localStorage.getItem(DEMO_ORDERS_KEY);
    if (!stored) return [];
    const orders = JSON.parse(stored) as Order[];
    // Restore counter to avoid ID collisions
    orders.forEach((o) => {
      const num = parseInt(o.id?.replace('demo_', '') || '0', 10);
      if (num > demoOrderCounter) demoOrderCounter = num;
    });
    return orders;
  } catch {
    return [];
  }
}

interface OrdersState {
  orders: Order[];
  activeOrders: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  totalCount: number;
  page: number;
  limit: number;

  // Actions
  fetchOrders: (params?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }) => Promise<void>;
  fetchActiveOrders: () => Promise<void>;
  fetchOrder: (id: string) => Promise<Order | null>;
  createOrder: (data: {
    tableId?: string;
    type: string;
    guestCount?: number;
    notes?: string;
    items: {
      productId: string;
      name?: string;
      unitPrice?: number;
      courseType?: string;
      quantity: number;
      notes?: string;
      modifiers?: { modifierOptionId: string }[];
    }[];
  }) => Promise<Order | null>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  addItemsToOrder: (
    orderId: string,
    items: {
      productId: string;
      quantity: number;
      notes?: string;
      modifiers?: { modifierOptionId: string }[];
    }[]
  ) => Promise<void>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<void>;
  sendToKitchen: (orderId: string) => Promise<void>;
  fetchOrdersByTable: (tableId: string) => Promise<Order[]>;
  setCurrentOrder: (order: Order | null) => void;
  updateOrderLocally: (order: Order) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  activeOrders: typeof window !== 'undefined' ? loadDemoOrders() : [],
  currentOrder: null,
  isLoading: false,
  totalCount: 0,
  page: 1,
  limit: 50,

  fetchOrders: async (params) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<PaginatedResponse<Order>>('/orders', {
        params: {
          page: params?.page || get().page,
          limit: params?.limit || get().limit,
          status: params?.status,
        },
      });
      set({
        orders: data.data,
        totalCount: data.meta.total,
        page: data.meta.page,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchActiveOrders: async () => {
    try {
      const { data } = await api.get<Order[]>('/orders/active');
      console.log('[ORDERS_STORE] fetchActiveOrders raw data:', Array.isArray(data) ? `${data.length} orders` : typeof data);
      const rawOrders = Array.isArray(data) ? data : [];
      const orders = normalizeOrders(rawOrders) as Order[];
      set({ activeOrders: orders });
    } catch (err) {
      console.log('[ORDERS_STORE] fetchActiveOrders error:', err);
      // In demo mode, restore persisted demo orders
      const demoOrders = loadDemoOrders();
      if (demoOrders.length > 0) {
        const existing = get().activeOrders;
        const existingIds = new Set(existing.map((o) => o.id));
        const newDemos = demoOrders.filter((o) => !existingIds.has(o.id));
        if (newDemos.length > 0) {
          set({ activeOrders: [...existing, ...newDemos] });
        }
      }
    }
  },

  fetchOrder: async (id: string) => {
    try {
      const { data } = await api.get<Order>(`/orders/${id}`);
      const order = normalizeOrder(data) as Order;
      console.log('[ORDERS_STORE] fetchOrder result:', order ? `Order #${order.orderNumber} items=${order.items?.length}` : 'null');
      set({ currentOrder: order });
      return order;
    } catch (err) {
      console.log('[ORDERS_STORE] fetchOrder error:', err);
      // Check in-memory activeOrders first, then persisted demo orders
      const inMemory = get().activeOrders.find((o) => o.id === id);
      if (inMemory) {
        set({ currentOrder: inMemory });
        return inMemory;
      }
      const demoOrders = loadDemoOrders();
      const demoOrder = demoOrders.find((o) => o.id === id);
      if (demoOrder) {
        set({ currentOrder: demoOrder });
        return demoOrder;
      }
      return null;
    }
  },

  createOrder: async (orderData) => {
    set({ isLoading: true });
    try {
      // Inject branchId from localStorage if not present
      const branchId = typeof window !== 'undefined' ? localStorage.getItem('maki_branch_id') : null;
      const payload = { ...orderData, branchId: branchId || undefined };
      const { data } = await api.post<Order>('/orders', payload);
      const order = normalizeOrder(data) as Order;
      set((state) => ({
        orders: [order, ...state.orders],
        activeOrders: [order, ...state.activeOrders],
        currentOrder: order,
        isLoading: false,
      }));
      return order;
    } catch {
      // Demo mode: create a local order with real names and prices from cart
      demoOrderCounter++;
      const now = new Date().toISOString();
      const demoItems: OrderItem[] = orderData.items.map((item, idx) => {
        const price = item.unitPrice || 0;
        return {
          id: `oi_${Date.now()}_${idx}`,
          orderId: `demo_${demoOrderCounter}`,
          productId: item.productId,
          name: item.name || item.productId,
          quantity: item.quantity,
          unitPrice: price,
          totalPrice: price * item.quantity,
          courseType: (item.courseType || 'PLATO_FUERTE') as OrderItem['courseType'],
          station: (item as any).station || undefined, // eslint-disable-line
          status: 'PENDING' as const,
          sortOrder: idx,
          notes: item.notes,
        };
      });
      const demoSubtotal = demoItems.reduce((s, i) => s + i.totalPrice, 0);
      const demoOrder: Order = {
        id: `demo_${demoOrderCounter}`,
        orderNumber: `${150 + demoOrderCounter}`,
        type: (orderData.type || 'DINE_IN') as Order['type'],
        status: 'OPEN',
        tableId: orderData.tableId,
        userId: 'demo-user',
        branchId: 'branch-1',
        items: demoItems,
        subtotal: demoSubtotal,
        taxAmount: 0,
        discountAmount: 0,
        tipAmount: 0,
        total: demoSubtotal,
        guestCount: orderData.guestCount,
        notes: orderData.notes,
        createdAt: now,
        updatedAt: now,
      };
      set((state) => {
        const newActive = [demoOrder, ...state.activeOrders];
        saveDemoOrders(newActive);
        return {
          orders: [demoOrder, ...state.orders],
          activeOrders: newActive,
          currentOrder: demoOrder,
          isLoading: false,
        };
      });
      return demoOrder;
    }
  },

  updateOrderStatus: async (id: string, status: OrderStatus) => {
    try {
      // Backend uses specific endpoints: POST /orders/:id/close, /cancel, /pay
      let data: Order;
      if (status === 'CLOSED') {
        const res = await api.post<Order>(`/orders/${id}/close`);
        data = res.data;
      } else if (status === 'CANCELLED') {
        const res = await api.post<Order>(`/orders/${id}/cancel`);
        data = res.data;
      } else {
        // Fallback for other statuses
        const res = await api.patch<Order>(`/orders/${id}/status`, { status });
        data = res.data;
      }
      set((state) => ({
        orders: state.orders.map((o) => (o.id === id ? data : o)),
        activeOrders:
          status === 'CLOSED' || status === 'CANCELLED'
            ? state.activeOrders.filter((o) => o.id !== id)
            : state.activeOrders.map((o) => (o.id === id ? data : o)),
        currentOrder: state.currentOrder?.id === id ? data : state.currentOrder,
      }));
    } catch {
      // Demo mode: update locally
      set((state) => {
        const newActive = status === 'CLOSED' || status === 'CANCELLED'
          ? state.activeOrders.filter((o) => o.id !== id)
          : state.activeOrders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o));
        saveDemoOrders(newActive);
        return {
          orders: state.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)),
          activeOrders: newActive,
          currentOrder: state.currentOrder?.id === id ? { ...state.currentOrder, status, updatedAt: new Date().toISOString() } : state.currentOrder,
        };
      });
    }
  },

  addItemsToOrder: async (orderId, items) => {
    try {
      const { data } = await api.post<Order>(`/orders/${orderId}/items`, { items });
      const order = normalizeOrder(data) as Order;
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? order : o)),
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? order : o)),
        currentOrder: state.currentOrder?.id === orderId ? order : state.currentOrder,
      }));
      toast.success('Items agregados');
    } catch {
      // handled by interceptor
    }
  },

  removeOrderItem: async (orderId, itemId) => {
    try {
      const { data } = await api.delete<Order>(`/orders/${orderId}/items/${itemId}`);
      const order = normalizeOrder(data) as Order;
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? order : o)),
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? order : o)),
        currentOrder: state.currentOrder?.id === orderId ? order : state.currentOrder,
      }));
    } catch {
      // handled by interceptor
    }
  },

  sendToKitchen: async (orderId) => {
    try {
      const { data } = await api.post<Order>(`/orders/${orderId}/send-to-kitchen`);
      set((state) => ({
        orders: state.orders.map((o) => (o.id === orderId ? data : o)),
        activeOrders: state.activeOrders.map((o) => (o.id === orderId ? data : o)),
        currentOrder: state.currentOrder?.id === orderId ? data : state.currentOrder,
      }));
    } catch {
      // Demo mode: update order status locally
      set((state) => {
        const updater = (o: Order) =>
          o.id === orderId
            ? { ...o, status: 'IN_PROGRESS' as OrderStatus, updatedAt: new Date().toISOString() }
            : o;
        const newActive = state.activeOrders.map(updater);
        saveDemoOrders(newActive);
        return {
          orders: state.orders.map(updater),
          activeOrders: newActive,
          currentOrder:
            state.currentOrder?.id === orderId
              ? { ...state.currentOrder, status: 'IN_PROGRESS' as OrderStatus }
              : state.currentOrder,
        };
      });
    }
  },

  fetchOrdersByTable: async (tableId: string) => {
    console.log('[ORDERS_STORE] fetchOrdersByTable called for:', tableId);
    try {
      const { data } = await api.get<Order[]>(`/orders/table/${tableId}`);
      const rawOrders = Array.isArray(data) ? data : [];
      const orders = normalizeOrders(rawOrders) as Order[];
      console.log('[ORDERS_STORE] fetchOrdersByTable result:', orders.length, 'orders');
      if (orders.length > 0) {
        console.log('[ORDERS_STORE] First order:', orders[0].orderNumber, 'items:', orders[0].items?.length);
      }
      return orders;
    } catch (err) {
      console.log('[ORDERS_STORE] fetchOrdersByTable error:', err);
      // Fallback: search activeOrders in memory
      let fallback = get().activeOrders.filter((o) => o.tableId === tableId);
      // Also check persisted demo orders
      if (fallback.length === 0) {
        const demoOrders = loadDemoOrders();
        fallback = demoOrders.filter((o) => o.tableId === tableId);
      }
      console.log('[ORDERS_STORE] fetchOrdersByTable fallback:', fallback.length, 'orders');
      return fallback;
    }
  },

  setCurrentOrder: (order) => set({ currentOrder: order }),

  updateOrderLocally: (order) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
      activeOrders: state.activeOrders.map((o) => (o.id === order.id ? order : o)),
      currentOrder: state.currentOrder?.id === order.id ? order : state.currentOrder,
    }));
  },
}));
