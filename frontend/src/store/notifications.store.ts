import { create } from 'zustand';

const LS_KEY = 'makiavelo-ready-notifications';

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

// Load initial state from localStorage
const loadFromStorage = (): ReadyItemNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const items = JSON.parse(saved) as ReadyItemNotification[];
      // Purge notifications older than 2 hours
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      return items.filter((n) => n.timestamp > twoHoursAgo);
    }
  } catch { /* ignore */ }
  return [];
};

const saveToStorage = (items: ReadyItemNotification[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  readyItems: loadFromStorage(),

  addReadyItem: (item) => {
    // Avoid duplicates (same itemId + orderId)
    const existing = get().readyItems;
    if (existing.some((n) => n.itemId === item.itemId && n.orderId === item.orderId && n.status === 'READY')) {
      return; // Already notified
    }
    const notification: ReadyItemNotification = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    const updated = [...existing, notification];
    saveToStorage(updated);
    set({ readyItems: updated });
  },

  markDelivered: (itemId) => {
    const updated = get().readyItems.map((n) =>
      n.itemId === itemId ? { ...n, status: 'DELIVERED' as const } : n
    );
    saveToStorage(updated);
    set({ readyItems: updated });
  },

  removeNotification: (id) => {
    const updated = get().readyItems.filter((n) => n.id !== id);
    saveToStorage(updated);
    set({ readyItems: updated });
  },

  getReadyItemsForTable: (tableNumber) => {
    return get().readyItems.filter(
      (n) => n.tableNumber === tableNumber && n.status === 'READY'
    );
  },

  clearAll: () => {
    saveToStorage([]);
    set({ readyItems: [] });
  },
}));
