import { create } from 'zustand';
import type { CartItem, CartItemModifier, CourseType } from '@/types';
import { generateTempId } from '@/lib/utils';

export interface ExistingOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: string;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  tableId: string | null;
  tableName: string | null;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  guestCount: number;
  notes: string;
  customerId: string | null;
  existingOrderId: string | null;
  existingItems: ExistingOrderItem[];

  // Computed
  subtotal: number;
  itemCount: number;

  // Actions
  addItem: (item: {
    productId: string;
    name: string;
    unitPrice: number;
    courseType: CourseType;
    station?: string;
    modifiers?: CartItemModifier[];
    notes?: string;
  }) => void;
  removeItem: (tempId: string) => void;
  updateQuantity: (tempId: string, quantity: number) => void;
  incrementQuantity: (tempId: string) => void;
  decrementQuantity: (tempId: string) => void;
  updateItemNotes: (tempId: string, notes: string) => void;
  setTable: (tableId: string, tableName: string) => void;
  setExistingOrder: (orderId: string, items: ExistingOrderItem[]) => void;
  setOrderType: (type: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY') => void;
  setGuestCount: (count: number) => void;
  setNotes: (notes: string) => void;
  setCustomerId: (id: string | null) => void;
  clearCart: () => void;
  getCartPayload: () => {
    tableId?: string;
    type: string;
    guestCount: number;
    notes?: string;
    customerId?: string;
    items: {
      productId: string;
      name: string;
      unitPrice: number;
      courseType: string;
      station?: string;
      quantity: number;
      notes?: string;
      modifiers?: { modifierOptionId: string }[];
    }[];
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  tableName: null,
  orderType: 'DINE_IN',
  guestCount: 1,
  notes: '',
  customerId: null,
  existingOrderId: null,
  existingItems: [],

  get subtotal() {
    return get().items.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0);
  },

  get itemCount() {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },

  addItem: (item) => {
    set((state) => {
      // Check if identical item (same product, same modifiers, same notes) exists
      const existingIndex = state.items.findIndex(
        (existing) =>
          existing.productId === item.productId &&
          existing.notes === (item.notes || '') &&
          JSON.stringify(existing.modifiers.map((m) => m.modifierId).sort()) ===
            JSON.stringify((item.modifiers || []).map((m) => m.modifierId).sort())
      );

      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return { items: updated };
      }

      return {
        items: [
          ...state.items,
          {
            tempId: generateTempId(),
            productId: item.productId,
            name: item.name,
            quantity: 1,
            unitPrice: item.unitPrice,
            courseType: item.courseType,
            station: item.station,
            modifiers: item.modifiers || [],
            notes: item.notes || '',
          },
        ],
      };
    });
  },

  removeItem: (tempId) => {
    set((state) => ({
      items: state.items.filter((i) => i.tempId !== tempId),
    }));
  },

  updateQuantity: (tempId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(tempId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.tempId === tempId ? { ...i, quantity } : i
      ),
    }));
  },

  incrementQuantity: (tempId) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.tempId === tempId ? { ...i, quantity: i.quantity + 1 } : i
      ),
    }));
  },

  decrementQuantity: (tempId) => {
    const item = get().items.find((i) => i.tempId === tempId);
    if (item && item.quantity <= 1) {
      get().removeItem(tempId);
    } else {
      set((state) => ({
        items: state.items.map((i) =>
          i.tempId === tempId ? { ...i, quantity: i.quantity - 1 } : i
        ),
      }));
    }
  },

  updateItemNotes: (tempId, notes) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.tempId === tempId ? { ...i, notes } : i
      ),
    }));
  },

  setTable: (tableId, tableName) => set({ tableId, tableName }),
  setExistingOrder: (orderId, items) => set({ existingOrderId: orderId, existingItems: items }),
  setOrderType: (type) => set({ orderType: type }),
  setGuestCount: (count) => set({ guestCount: Math.max(1, count) }),
  setNotes: (notes) => set({ notes }),
  setCustomerId: (id) => set({ customerId: id }),

  clearCart: () =>
    set({
      items: [],
      tableId: null,
      tableName: null,
      orderType: 'DINE_IN',
      guestCount: 1,
      notes: '',
      customerId: null,
      existingOrderId: null,
      existingItems: [],
    }),

  getCartPayload: () => {
    const state = get();
    return {
      tableId: state.tableId || undefined,
      type: state.orderType,
      guestCount: state.guestCount,
      notes: state.notes || undefined,
      customerId: state.customerId || undefined,
      items: state.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        unitPrice: item.unitPrice,
        courseType: item.courseType,
        station: item.station || undefined,
        quantity: item.quantity,
        notes: item.notes || undefined,
        modifiers: item.modifiers.length > 0
          ? item.modifiers.map((m) => ({ modifierOptionId: m.modifierId }))
          : undefined,
      })),
    };
  },
}));
