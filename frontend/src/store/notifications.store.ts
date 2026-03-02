import { create } from 'zustand';

export interface ReadyItemNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  itemId: string;
  itemName: string;
  tableNumber?: number;
  tableName?: string;
  status: 'READY' | 'DELIVERED';
  quantity?: number;
  timestamp: number;
}

interface NotificationsState {
  readyItems: ReadyItemNotification[];
  addReadyItem: (item: Omit<ReadyItemNotification, 'id' | 'timestamp'>) => void;
  markDelivered: (itemId: string) => void;
  removeNotification: (id: string) => void;
  getReadyItemsForTable: (tableNumber: number) => ReadyItemNotification[];
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  readyItems: [],

  addReadyItem: (item) => {
    const notification: ReadyItemNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    set((state) => ({
      readyItems: [...state.readyItems, notification],
    }));
  },

  markDelivered: (itemId) => {
    set((state) => ({
      readyItems: state.readyItems.map((n) =>
        n.itemId === itemId ? { ...n, status: 'DELIVERED' as const } : n
      ),
    }));
  },

  removeNotification: (id) => {
    set((state) => ({
      readyItems: state.readyItems.filter((n) => n.id !== id),
    }));
  },

  getReadyItemsForTable: (tableNumber) => {
    return get().readyItems.filter(
      (n) => n.tableNumber === tableNumber && n.status === 'READY'
    );
  },

  clearAll: () => set({ readyItems: [] }),
}));
