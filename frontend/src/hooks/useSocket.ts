import { useEffect, useCallback, useRef } from 'react';
import { getSocket, SocketEvents } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useOrdersStore } from '@/store/orders.store';
import { useTablesStore } from '@/store/tables.store';
import type { Order, Table } from '@/types';

export function useSocket() {
  const { isAuthenticated, setOnline } = useAuthStore();
  const { updateOrderLocally, fetchActiveOrders } = useOrdersStore();
  const { updateTableLocally, fetchTables } = useTablesStore();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleConnect = () => {
      if (mountedRef.current) setOnline(true);
    };

    const handleDisconnect = () => {
      if (mountedRef.current) setOnline(false);
    };

    const handleOrderCreated = (order: Order) => {
      if (mountedRef.current) {
        updateOrderLocally(order);
        fetchActiveOrders();
      }
    };

    const handleOrderUpdated = (order: Order) => {
      if (mountedRef.current) {
        updateOrderLocally(order);
      }
    };

    const handleTableStatusChanged = (table: Table) => {
      if (mountedRef.current) {
        updateTableLocally(table);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on(SocketEvents.ORDER_CREATED, handleOrderCreated);
    socket.on(SocketEvents.ORDER_UPDATED, handleOrderUpdated);
    socket.on(SocketEvents.TABLE_STATUS_CHANGED, handleTableStatusChanged);

    // Sync handler
    socket.on(SocketEvents.SYNC, () => {
      if (mountedRef.current) {
        fetchActiveOrders();
        fetchTables();
      }
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off(SocketEvents.ORDER_CREATED, handleOrderCreated);
      socket.off(SocketEvents.ORDER_UPDATED, handleOrderUpdated);
      socket.off(SocketEvents.TABLE_STATUS_CHANGED, handleTableStatusChanged);
      socket.off(SocketEvents.SYNC);
    };
  }, [isAuthenticated, setOnline, updateOrderLocally, updateTableLocally, fetchActiveOrders, fetchTables]);

  const emit = useCallback(
    (event: string, data?: unknown) => {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit(event, data);
      }
    },
    []
  );

  return { emit };
}

export function useSocketEvent<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();

    const listener = (data: T) => {
      handlerRef.current(data);
    };

    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
