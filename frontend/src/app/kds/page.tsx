'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import KdsOrderCard from '@/components/common/KdsOrderCard';
import RequirePermission from '@/components/common/RequirePermission';
import { cn } from '@/lib/utils';
import type { KdsOrder, KdsOrderItem } from '@/types';
import api from '@/lib/api';
import { useSocketEvent } from '@/hooks/useSocket';
import { useOrdersStore } from '@/store/orders.store';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import toast from 'react-hot-toast';

const allStations = [
  { id: 'all', label: 'Todas' },
  { id: 'cocina-caliente', label: 'Cocina Caliente' },
  { id: 'cocina-fria', label: 'Cocina Fria' },
  { id: 'sushi', label: 'Sushi' },
  { id: 'barra', label: 'Barra' },
  { id: 'parrilla', label: 'Parrilla' },
];

// Stations visible per role for item filtering
const ROLE_STATION_FILTER: Record<string, string[] | 'all'> = {
  bartender: ['barra'],
  chef: ['cocina-caliente', 'cocina-fria', 'sushi', 'parrilla'],
  kitchen: ['cocina-caliente', 'cocina-fria', 'sushi', 'parrilla'],
  owner: 'all',
  admin: 'all',
  manager: 'all',
  server: 'all',
  waiter: 'all',
  cashier: 'all',
};

// Stations visible in the station tab bar per role
const ROLE_STATIONS: Record<string, string[]> = {
  bartender: ['all', 'barra'],
  chef: ['all', 'cocina-caliente', 'cocina-fria', 'sushi', 'parrilla'],
  kitchen: ['all', 'cocina-caliente', 'cocina-fria', 'sushi', 'parrilla'],
};

// Default station per role
const ROLE_DEFAULT_STATION: Record<string, string> = {
  bartender: 'barra',
  chef: 'all',
  kitchen: 'all',
};

// KDS title per role
const ROLE_KDS_TITLE: Record<string, string> = {
  bartender: '🍸 Bar',
  chef: '🔥 Cocina',
  kitchen: '🔥 Cocina',
};

// Kitchen PIN for activating control mode
const KITCHEN_PIN = '0000';

export default function KdsPageWrapper() {
  return (
    <RequirePermission permission="kds">
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-900"><div className="w-8 h-8 border-4 border-maki-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <KdsPage />
    </Suspense>
    </RequirePermission>
  );
}

function KdsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrders, updateOrderStatus } = useOrdersStore();
  const { user, logout } = useAuthStore();
  const roleSlug = user?.role?.slug || '';

  // Role-based station filtering
  const visibleStations = useMemo(() => {
    const allowedIds = ROLE_STATIONS[roleSlug];
    if (!allowedIds) return allStations; // owner/admin/manager/waiter see all
    return allStations.filter((s) => allowedIds.includes(s.id));
  }, [roleSlug]);

  const defaultStation = ROLE_DEFAULT_STATION[roleSlug] || 'all';
  const kdsTitle = ROLE_KDS_TITLE[roleSlug] || '🔥 Cocina';

  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [bumpedOrderIds, setBumpedOrderIds] = useState<Set<string>>(new Set());
  const [selectedStation, setSelectedStation] = useState(defaultStation);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Kitchen mode: only with PIN, query param, or kitchen-related roles
  const [isKitchenMode, setIsKitchenMode] = useState(false);
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Auto-activate kitchen mode for chef/kitchen/bartender roles and admin/owner
  const kitchenRoles = ['chef', 'kitchen', 'bartender', 'owner', 'admin', 'manager'];

  useEffect(() => {
    const slug = user?.role?.slug || '';
    if (kitchenRoles.includes(slug) || searchParams.get('mode') === 'kitchen') {
      setIsKitchenMode(true);
    }
  }, [searchParams, user]);

  // Demo KDS orders
  // No demo orders — KDS starts clean; only real orders from pedidos appear
  const demoOrders: KdsOrder[] = useMemo(() => [], []);

  const isUsingBackend = useRef(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/kds/orders');
        if (Array.isArray(data) && data.length > 0) {
          setOrders(data);
          isUsingBackend.current = true;
        } else if (!isUsingBackend.current && orders.length === 0) {
          // Only set demo orders if we haven't received backend data and no local changes
          setOrders(demoOrders);
        }
      } catch {
        if (orders.length === 0) {
          setOrders(demoOrders);
        }
        // If orders already have local changes, don't overwrite with demoOrders
      }
      setIsLoading(false);
    };
    fetchOrders();
    // Only poll backend if we're connected to it
    const interval = setInterval(() => {
      if (isUsingBackend.current) fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [demoOrders]);

  // Socket events for new orders
  useSocketEvent('kds:new-item', (data: KdsOrder) => {
    setOrders((prev) => [data, ...prev]);
    if (soundEnabled) playAlert();
    toast('Nueva orden!', { icon: '🔔', duration: 2000 });
  });

  const playAlert = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Bfnl0dHyAgYF9eXl+g4SEfnh3fIOIiIV+e3t/hYqKh4J9fH+Fioq...');
      }
      audioRef.current.play().catch(() => {});
    } catch {
      // Audio not available
    }
  }, []);

  // Convert active orders from orders store (sent from pedidos) to KDS format
  const storeKdsOrders: KdsOrder[] = useMemo(() => {
    return activeOrders
      .filter((o) => (o.status === 'IN_PROGRESS' || o.status === 'OPEN') && !bumpedOrderIds.has(o.id))
      .map((o) => {
        const created = new Date(o.createdAt);
        const elapsedMin = Math.floor((Date.now() - created.getTime()) / 60000);
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          tableNumber: parseInt(o.tableId?.replace(/\D/g, '') || '0', 10),
          tableName: o.tableId
            ? (() => {
                // Try multiple localStorage keys for table name resolution
                const keys = ['makiavelo-table-layout', 'makiavelo-table-positions'];
                for (const key of keys) {
                  try {
                    const saved = localStorage.getItem(key);
                    if (saved) {
                      const tables = JSON.parse(saved);
                      if (Array.isArray(tables)) {
                        const t = tables.find((t: Record<string, unknown>) => t.id === o.tableId);
                        if (t && t.name) return t.name as string;
                      } else if (typeof tables === 'object' && tables[o.tableId!]) {
                        return `Mesa`; // position data only, no name
                      }
                    }
                  } catch { /* noop */ }
                }
                // Fallback: extract table number from tableId
                const num = o.tableId?.replace(/\D/g, '');
                return num ? `Mesa ${num}` : 'Mesa';
              })()
            : 'Para Llevar',
          items: o.items.map((item) => ({
            id: item.id,
            name: item.name || item.productId,
            quantity: item.quantity,
            status: (item.status === 'READY' ? 'READY' : 'PENDING') as 'PENDING' | 'PREPARING' | 'READY',
            courseType: item.courseType,
            station: item.station || undefined,
            notes: item.notes,
          })),
          createdAt: o.createdAt,
          elapsedMinutes: elapsedMin,
          serverName: 'Tú',
          status: 'NEW' as const,
          notes: o.notes,
        };
      });
  }, [activeOrders, bumpedOrderIds]);

  // Merge store orders with demo/API orders, avoiding duplicates
  const displayOrders = useMemo(() => {
    const base = orders.length > 0 ? orders : demoOrders;
    const existingIds = new Set(base.map((o) => o.id));
    const newFromStore = storeKdsOrders.filter((o) => !existingIds.has(o.id));
    return [...newFromStore, ...base];
  }, [orders, demoOrders, storeKdsOrders]);

  // Step 1: Filter items by role station (bartender=barra, chef=cocina+sushi+parrilla)
  const roleFilteredOrders = useMemo(() => {
    const allowedStations = ROLE_STATION_FILTER[roleSlug] || 'all';
    if (allowedStations === 'all') return displayOrders;

    return displayOrders
      .map((o) => ({
        ...o,
        items: o.items.filter((i: KdsOrderItem) =>
          i.station ? allowedStations.includes(i.station) : true
        ),
      }))
      .filter((o) => o.items.length > 0); // Hide orders with no relevant items
  }, [displayOrders, roleSlug]);

  // Step 2: Filter by selected station tab
  const filteredOrders = useMemo(() => {
    if (selectedStation === 'all') return roleFilteredOrders;
    return roleFilteredOrders
      .map((o) => ({
        ...o,
        items: o.items.filter((i: KdsOrderItem) => i.station === selectedStation),
      }))
      .filter((o) => o.items.length > 0);
  }, [roleFilteredOrders, selectedStation]);

  // -------------------------------------------------------------------------
  // BUMP HANDLERS — the single source of truth for all displayed orders
  // is `displayOrders`. But `setOrders` only controls `orders` state.
  // Orders can come from 3 sources:
  //   1. `orders` state (demo data or API data)
  //   2. `demoOrders` (fallback when orders=[])
  //   3. `storeKdsOrders` (from orders Zustand store, e.g. new orders from pedidos)
  //
  // To ensure bump always works, we build a FULL list merging all sources,
  // modify it, and set it as the new `orders` state.
  // -------------------------------------------------------------------------

  const getAllOrders = useCallback((): KdsOrder[] => {
    // Build the same merged list as displayOrders, but return a writable copy
    const base = orders.length > 0 ? [...orders] : [...demoOrders];
    const existingIds = new Set(base.map((o) => o.id));
    const fromStore = storeKdsOrders.filter((o) => !existingIds.has(o.id));
    return [...fromStore, ...base];
  }, [orders, demoOrders, storeKdsOrders]);

  const handleBump = async (orderId: string) => {
    if (!isKitchenMode) return;

    const allOrders = getAllOrders();
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;

    const newStatus = order.status === 'NEW' || order.status === 'LATE' ? 'PREPARING' : 'READY';

    if (newStatus === 'READY') {
      // Bump ALL items in this order to READY via backend
      const pendingItems = order.items.filter((i: KdsOrderItem) => i.status !== 'READY');
      for (const item of pendingItems) {
        try { await api.post(`/kds/items/${item.id}/bump`); } catch { /* demo */ }
      }

      // Notify mesero for each item
      order.items.forEach((item: KdsOrderItem) => {
        useNotificationsStore.getState().addReadyItem({
          orderId: order.id, orderNumber: order.orderNumber,
          itemId: item.id, itemName: item.name,
          tableNumber: order.tableNumber, tableName: order.tableName,
          status: 'READY', quantity: item.quantity,
        });
      });

      toast.success(`Orden #${order.orderNumber} LISTA`, { duration: 2000 });
      // Remove this order from the full list and save
      setOrders(allOrders.filter((o) => o.id !== orderId));
      // Mark as bumped so storeKdsOrders won't re-add it
      setBumpedOrderIds((prev) => new Set(prev).add(orderId));
      // Update Zustand store so the order is no longer IN_PROGRESS
      updateOrderStatus(orderId, 'CLOSED').catch(() => { /* demo mode */ });
    } else {
      // NEW/LATE → PREPARING
      setOrders(allOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'PREPARING' as KdsOrder['status'] } : o
      ));
      toast(`Preparando orden #${order.orderNumber}`, { icon: '🔥', duration: 1500 });
    }
  };

  const handleItemBump = async (orderId: string, itemId: string) => {
    if (!isKitchenMode) return;

    const allOrders = getAllOrders();
    const order = allOrders.find((o) => o.id === orderId);
    const item = order?.items.find((i: KdsOrderItem) => i.id === itemId);

    // Try backend
    try { await api.post(`/kds/items/${itemId}/bump`); } catch { /* demo */ }

    // Update item to READY; if all items ready, mark order as READY
    const updated = allOrders.map((o) => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map((i: KdsOrderItem) =>
        i.id === itemId ? { ...i, status: 'READY' as const } : i
      );
      const allReady = updatedItems.every((i: KdsOrderItem) => i.status === 'READY');
      return { ...o, items: updatedItems, status: allReady ? 'READY' as const : o.status };
    });
    setOrders(updated);

    // Check if all items are now READY — if so, auto-remove after a short delay
    const updatedOrder = updated.find((o) => o.id === orderId);
    const allItemsReady = updatedOrder?.items.every((i: KdsOrderItem) => i.status === 'READY');

    // Notify mesero
    if (order && item) {
      useNotificationsStore.getState().addReadyItem({
        orderId: order.id, orderNumber: order.orderNumber,
        itemId: item.id, itemName: item.name,
        tableNumber: order.tableNumber, tableName: order.tableName,
        status: 'READY', quantity: item.quantity,
      });
      toast.success(`${item.name} LISTO!`, { icon: '✅', duration: 1500 });
    }

    // If all items ready, notify all and remove order after delay
    if (allItemsReady && updatedOrder) {
      toast.success(`Orden #${updatedOrder.orderNumber} completa!`, { icon: '🎉', duration: 2000 });
      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setBumpedOrderIds((prev) => new Set(prev).add(orderId));
        updateOrderStatus(orderId, 'CLOSED').catch(() => { /* demo mode */ });
      }, 1500);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  // PIN handler
  const handlePinDigit = (digit: string) => {
    const newPin = pinInput + digit;
    setPinInput(newPin);
    if (newPin.length >= 4) {
      if (newPin === KITCHEN_PIN) {
        setIsKitchenMode(true);
        setShowPinSheet(false);
        setPinInput('');
        toast.success('Modo Cocina activado', { icon: '🔓', duration: 2000 });
      } else {
        setPinInput('');
        toast.error('PIN incorrecto', { duration: 1500 });
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  // Status counts
  const counts = useMemo(() => {
    const c = { new: 0, preparing: 0, ready: 0, late: 0 };
    filteredOrders.forEach((o) => {
      if (o.status === 'NEW') c.new++;
      else if (o.status === 'PREPARING') c.preparing++;
      else if (o.status === 'READY') c.ready++;
      if (o.elapsedMinutes >= 15 && o.status !== 'READY') c.late++;
    });
    return c;
  }, [filteredOrders]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* KDS Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Left: Back + Title + station */}
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { logout(); router.push('/login'); }}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30
                     flex items-center justify-center transition-colors touch-manipulation"
            title="Salir del sistema"
          >
            <ArrowRightStartOnRectangleIcon className="w-6 h-6 text-red-400" />
          </motion.button>
          <h1 className="text-touch-xl font-black text-white">{kdsTitle}</h1>

          {/* Role badge */}
          {isKitchenMode ? (
            <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400 flex items-center gap-1">
              <LockOpenIcon className="w-3.5 h-3.5" />
              Control Activo
            </span>
          ) : (
            <span className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-full text-xs font-bold text-gray-400 flex items-center gap-1">
              <LockClosedIcon className="w-3.5 h-3.5" />
              Solo Lectura
            </span>
          )}

          <div className="flex gap-2 overflow-x-auto scrollbar-hide ml-2">
            {visibleStations.map((station) => (
              <motion.button
                key={station.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedStation(station.id)}
                className={cn(
                  'min-h-[40px] px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap',
                  'transition-all duration-150 touch-manipulation',
                  selectedStation === station.id
                    ? 'bg-maki-gold text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                )}
              >
                {station.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right: Status + controls */}
        <div className="flex items-center gap-3">
          {/* Status badges */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-white/10 rounded text-xs font-bold text-white">
              Nuevas: {counts.new}
            </span>
            <span className="px-2 py-1 bg-amber-500/20 rounded text-xs font-bold text-amber-400">
              Prep: {counts.preparing}
            </span>
            {counts.late > 0 && (
              <span className="px-2 py-1 bg-red-500/20 rounded text-xs font-bold text-red-400 animate-pulse-soft">
                Tarde: {counts.late}
              </span>
            )}
          </div>

          {/* Kitchen mode toggle */}
          {!isKitchenMode ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { setShowPinSheet(true); setPinInput(''); }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                       bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30
                       transition-colors touch-manipulation"
              title="Activar Modo Cocina"
            >
              <LockClosedIcon className="w-5 h-5 text-emerald-400" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setIsKitchenMode(false);
                toast('Modo lectura activado', { icon: '🔒', duration: 1500 });
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
                       bg-emerald-600 hover:bg-emerald-700
                       transition-colors touch-manipulation"
              title="Desactivar Modo Cocina"
            >
              <LockOpenIcon className="w-5 h-5 text-white" />
            </motion.button>
          )}

          {/* Controls */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg
                     bg-gray-700 hover:bg-gray-600 transition-colors touch-manipulation"
          >
            {soundEnabled ? (
              <SpeakerWaveIcon className="w-5 h-5 text-emerald-400" />
            ) : (
              <SpeakerXMarkIcon className="w-5 h-5 text-red-400" />
            )}
          </button>

          <button
            onClick={toggleFullScreen}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg
                     bg-gray-700 hover:bg-gray-600 transition-colors touch-manipulation"
          >
            <ArrowsPointingOutIcon className="w-5 h-5 text-gray-400" />
          </button>

          <button
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => setIsLoading(false), 500);
            }}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg
                     bg-gray-700 hover:bg-gray-600 transition-colors touch-manipulation"
          >
            <ArrowPathIcon className={cn('w-5 h-5 text-gray-400', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Read-only banner for mesero */}
      {!isKitchenMode && (
        <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700/50 flex items-center justify-center gap-2">
          <LockClosedIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">
            Vista de mesero · Solo puedes ver el estado de las comandas
          </span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowPinSheet(true); setPinInput(''); }}
            className="ml-2 px-3 py-1 bg-emerald-600/20 border border-emerald-500/30 rounded-full
                     text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition-colors touch-manipulation"
          >
            Activar Cocina (PIN)
          </motion.button>
        </div>
      )}

      {/* KDS Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        {filteredOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-600 mb-2">Sin ordenes</p>
              <p className="text-gray-500">Las nuevas ordenes apareceran aqui</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  onBump={isKitchenMode ? handleBump : undefined}
                  onItemBump={isKitchenMode ? handleItemBump : undefined}
                  lateThresholdMinutes={15}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* PIN Entry Sheet */}
      <AnimatePresence>
        {showPinSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setShowPinSheet(false)}
            />
            {/* PIN Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gray-800 border border-gray-700 rounded-3xl p-8 w-full max-w-sm shadow-2xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <LockClosedIcon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white">PIN de Cocina</h2>
                  <p className="text-sm text-gray-400 mt-1">Ingresa el PIN para activar controles</p>
                </div>

                {/* PIN display */}
                <div className="flex justify-center gap-3 mb-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-14 h-14 rounded-xl border-2 flex items-center justify-center',
                        'transition-all duration-200',
                        pinInput.length > i
                          ? 'border-emerald-500 bg-emerald-500/20'
                          : 'border-gray-600 bg-gray-700'
                      )}
                    >
                      {pinInput.length > i && (
                        <div className="w-4 h-4 rounded-full bg-emerald-400" />
                      )}
                    </div>
                  ))}
                </div>

                {/* PIN pad */}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((digit) => {
                    if (digit === '') return <div key="empty" />;
                    if (digit === '←') {
                      return (
                        <motion.button
                          key="del"
                          whileTap={{ scale: 0.9 }}
                          onClick={handlePinDelete}
                          className="min-h-[60px] rounded-xl bg-gray-700 hover:bg-gray-600
                                   text-white text-xl font-bold transition-colors touch-manipulation"
                        >
                          ←
                        </motion.button>
                      );
                    }
                    return (
                      <motion.button
                        key={digit}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handlePinDigit(digit)}
                        className="min-h-[60px] rounded-xl bg-gray-700 hover:bg-gray-600
                                 text-white text-2xl font-bold transition-colors touch-manipulation"
                      >
                        {digit}
                      </motion.button>
                    );
                  })}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPinSheet(false)}
                  className="w-full mt-4 min-h-[48px] rounded-xl bg-gray-700 hover:bg-gray-600
                           text-gray-400 font-semibold transition-colors touch-manipulation"
                >
                  Cancelar
                </motion.button>

                <p className="text-xs text-gray-600 text-center mt-3">PIN demo: 0000</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
