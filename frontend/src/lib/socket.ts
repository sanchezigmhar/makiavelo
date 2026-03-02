import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket = (token: string, branchId: string): Socket => {
  const s = getSocket();

  s.auth = { token, branchId };

  if (!s.connected) {
    s.connect();
  }

  s.on('connect', () => {
    console.log('[Socket] Connected:', s.id);
  });

  s.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  s.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return s;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// Socket event types
export enum SocketEvents {
  // Orders
  ORDER_CREATED = 'order:created',
  ORDER_UPDATED = 'order:updated',
  ORDER_ITEM_STATUS = 'order:item-status',
  ORDER_CANCELLED = 'order:cancelled',

  // Tables
  TABLE_STATUS_CHANGED = 'table:status-changed',
  TABLE_ASSIGNED = 'table:assigned',

  // KDS
  KDS_NEW_ITEM = 'kds:new-item',
  KDS_ITEM_READY = 'kds:item-ready',
  KDS_ITEM_BUMP = 'kds:item-bump',

  // Alerts
  ALERT_NEW = 'alert:new',
  ALERT_INVENTORY_LOW = 'alert:inventory-low',

  // Payments
  PAYMENT_COMPLETED = 'payment:completed',

  // Shifts
  SHIFT_OPENED = 'shift:opened',
  SHIFT_CLOSED = 'shift:closed',

  // General
  NOTIFICATION = 'notification',
  SYNC = 'sync',
}

export default getSocket;
