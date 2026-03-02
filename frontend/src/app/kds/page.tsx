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
  { id: 'sushi-bar', label: 'Sushi Bar' },
  { id: 'bar', label: 'Bar' },
  { id: 'postres', label: 'Postres' },
];

// Course types visible per role
const ROLE_COURSE_TYPES: Record<string, string[] | 'all'> = {
  bartender: ['BEBIDA'],
  chef: ['PLATO_FUERTE', 'ENTRADA', 'POSTRE', 'ACOMPANAMIENTO'],
  kitchen: ['PLATO_FUERTE', 'ENTRADA', 'POSTRE', 'ACOMPANAMIENTO'],
  owner: 'all',
  admin: 'all',
  manager: 'all',
  server: 'all',
  waiter: 'all',
  cashier: 'all',
};

// Stations visible per role
const ROLE_STATIONS: Record<string, string[]> = {
  bartender: ['all', 'bar'],
  chef: ['all', 'cocina-caliente', 'cocina-fria', 'sushi-bar', 'postres'],
  kitchen: ['all', 'cocina-caliente', 'cocina-fria', 'sushi-bar', 'postres'],
};

// Default station per role
const ROLE_DEFAULT_STATION: Record<string, string> = {
  bartender: 'bar',
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
  const { activeOrders } = useOrdersStore();
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
  const demoOrders: KdsOrder[] = useMemo(() => [
    {
      id: 'kds-1', orderNumber: '142', tableNumber: 3, tableName: 'Mesa 3',
      items: [
        { id: 'ki1', name: 'Dragon Roll', quantity: 2, status: 'PENDING', courseType: 'PLATO_FUERTE', modifiers: ['Extra wasabi'] },
        { id: 'ki2', name: 'Edamame', quantity: 1, status: 'PENDING', courseType: 'ENTRADA' },
      ],
      createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
      elapsedMinutes: 3, serverName: 'Carlos', status: 'NEW',
    },
    {
      id: 'kds-2', orderNumber: '141', tableNumber: 7, tableName: 'Mesa 7',
      items: [
        { id: 'ki3', name: 'Ramen Tonkotsu', quantity: 1, status: 'PREPARING', courseType: 'PLATO_FUERTE' },
        { id: 'ki4', name: 'Gyoza (6 pcs)', quantity: 2, status: 'READY', courseType: 'ENTRADA' },
        { id: 'ki5', name: 'Miso Soup', quantity: 1, status: 'PREPARING', courseType: 'ENTRADA' },
      ],
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      elapsedMinutes: 8, serverName: 'Maria', status: 'PREPARING',
      notes: 'Cliente alergico al mani',
    },
    {
      id: 'kds-3', orderNumber: '139', tableNumber: 12, tableName: 'Mesa 12',
      items: [
        { id: 'ki6', name: 'Wagyu Tataki', quantity: 1, status: 'PREPARING', courseType: 'PLATO_FUERTE', notes: 'Termino medio' },
        { id: 'ki7', name: 'Tempura Mixto', quantity: 1, status: 'READY', courseType: 'ENTRADA' },
        { id: 'ki8', name: 'Teriyaki Chicken', quantity: 2, status: 'PREPARING', courseType: 'PLATO_FUERTE' },
      ],
      createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
      elapsedMinutes: 14, serverName: 'Pedro', status: 'PREPARING',
    },
    {
      id: 'kds-4', orderNumber: '138', tableNumber: 1, tableName: 'Mesa 1',
      items: [
        { id: 'ki9', name: 'Salmon Roll', quantity: 3, status: 'PREPARING', courseType: 'PLATO_FUERTE' },
        { id: 'ki10', name: 'Spicy Tuna Roll', quantity: 2, status: 'PENDING', courseType: 'PLATO_FUERTE' },
      ],
      createdAt: new Date(Date.now() - 18 * 60000).toISOString(),
      elapsedMinutes: 18, serverName: 'Ana', status: 'LATE',
    },
    {
      id: 'kds-5', orderNumber: '143', tableNumber: 9, tableName: 'Mesa 9',
      items: [
        { id: 'ki11', name: 'Mochi Ice Cream', quantity: 4, status: 'PENDING', courseType: 'POSTRE' },
        { id: 'ki12', name: 'Matcha Cheesecake', quantity: 2, status: 'PENDING', courseType: 'POSTRE' },
      ],
      createdAt: new Date(Date.now() - 1 * 60000).toISOString(),
      elapsedMinutes: 1, serverName: 'Carlos', status: 'NEW',
    },
    {
      id: 'kds-6', orderNumber: '144', tableNumber: 3, tableName: 'Mesa 3',
      items: [
        { id: 'ki13', name: 'Margarita Clasica', quantity: 2, status: 'PENDING', courseType: 'BEBIDA' },
        { id: 'ki14', name: 'Mojito', quantity: 1, status: 'PENDING', courseType: 'BEBIDA' },
      ],
      createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
      elapsedMinutes: 2, serverName: 'Maria', status: 'NEW',
    },
    {
      id: 'kds-7', orderNumber: '145', tableNumber: 5, tableName: 'Mesa 5',
      items: [
        { id: 'ki15', name: 'Pina Colada', quantity: 1, status: 'PREPARING', courseType: 'BEBIDA' },
        { id: 'ki16', name: 'Sake Caliente', quantity: 2, status: 'PENDING', courseType: 'BEBIDA' },
        { id: 'ki17', name: 'Cerveza Artesanal', quantity: 3, status: 'PENDING', courseType: 'BEBIDA' },
      ],
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      elapsedMinutes: 5, serverName: 'Ana', status: 'PREPARING',
    },
    {
      id: 'kds-8', orderNumber: '140', tableNumber: 7, tableName: 'Mesa 7',
      items: [
        { id: 'ki18', name: 'Whisky Sour', quantity: 1, status: 'PREPARING', courseType: 'BEBIDA' },
        { id: 'ki19', name: 'Agua Mineral', quantity: 2, status: 'READY', courseType: 'BEBIDA' },
      ],
      createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
      elapsedMinutes: 10, serverName: 'Pedro', status: 'PREPARING',
    },
  ], []);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/kds/orders');
        setOrders(data);
      } catch {
        setOrders(demoOrders);
      }
      setIsLoading(false);
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
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
      .filter((o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN')
      .map((o) => {
        const created = new Date(o.createdAt);
        const elapsedMin = Math.floor((Date.now() - created.getTime()) / 60000);
        return {
          id: o.id,
          orderNumber: o.orderNumber,
          tableNumber: 0,
          tableName: o.tableId
            ? (() => {
                try {
                  const saved = localStorage.getItem('makiavelo-table-layout');
                  if (saved) {
                    const tables = JSON.parse(saved);
                    const t = tables.find((t: Record<string, unknown>) => t.id === o.tableId);
                    if (t) return t.name as string;
                  }
                } catch { /* noop */ }
                return 'Mesa';
              })()
            : 'Para Llevar',
          items: o.items.map((item) => ({
            id: item.id,
            name: item.name || item.productId,
            quantity: item.quantity,
            status: (item.status === 'READY' ? 'READY' : 'PENDING') as 'PENDING' | 'PREPARING' | 'READY',
            courseType: item.courseType,
            notes: item.notes,
          })),
          createdAt: o.createdAt,
          elapsedMinutes: elapsedMin,
          serverName: 'Tú',
          status: 'NEW' as const,
          notes: o.notes,
        };
      });
  }, [activeOrders]);

  // Merge store orders with demo/API orders, avoiding duplicates
  const displayOrders = useMemo(() => {
    const base = orders.length > 0 ? orders : demoOrders;
    const existingIds = new Set(base.map((o) => o.id));
    const newFromStore = storeKdsOrders.filter((o) => !existingIds.has(o.id));
    return [...newFromStore, ...base];
  }, [orders, demoOrders, storeKdsOrders]);

  // Step 1: Filter items by role (bartender=BEBIDA, chef=food)
  const roleFilteredOrders = useMemo(() => {
    const allowedTypes = ROLE_COURSE_TYPES[roleSlug] || 'all';
    if (allowedTypes === 'all') return displayOrders;

    return displayOrders
      .map((o) => ({
        ...o,
        items: o.items.filter((i: KdsOrderItem) => allowedTypes.includes(i.courseType)),
      }))
      .filter((o) => o.items.length > 0); // Hide orders with no relevant items
  }, [displayOrders, roleSlug]);

  // Step 2: Filter by selected station
  const filteredOrders = useMemo(() => {
    if (selectedStation === 'all') return roleFilteredOrders;
    return roleFilteredOrders.filter((o) =>
      o.items.some((i: KdsOrderItem) => {
        const stationMap: Record<string, string[]> = {
          'cocina-caliente': ['PLATO_FUERTE', 'ENTRADA'],
          'cocina-fria': ['ENTRADA'],
          'sushi-bar': ['PLATO_FUERTE'],
          'bar': ['BEBIDA'],
          'postres': ['POSTRE'],
        };
        return stationMap[selectedStation]?.includes(i.courseType);
      })
    );
  }, [roleFilteredOrders, selectedStation]);

  const handleBump = async (orderId: string) => {
    if (!isKitchenMode) return; // Only kitchen can bump

    const order = displayOrders.find((o) => o.id === orderId);
    if (!order) return;

    const newStatus = order.status === 'NEW' ? 'PREPARING' : 'READY';

    if (newStatus === 'READY') {
      // Bump ALL items in this order to READY via backend
      let backendSuccess = false;
      const pendingItems = order.items.filter((i: KdsOrderItem) => i.status !== 'READY');

      for (const item of pendingItems) {
        try {
          await api.post(`/api/v1/kds/items/${item.id}/bump`);
          backendSuccess = true;
        } catch {
          // Will handle in demo mode below
        }
      }

      // Notify mesero for each item (demo mode or as fallback)
      order.items.forEach((item: KdsOrderItem) => {
        useNotificationsStore.getState().addReadyItem({
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemId: item.id,
          itemName: item.name,
          tableNumber: order.tableNumber,
          tableName: order.tableName,
          status: 'READY',
          quantity: item.quantity,
        });
      });

      toast.success(`Orden #${order.orderNumber} LISTA`, { duration: 2000 });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } else {
      // NEW → PREPARING: just update local state
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status: 'PREPARING' as KdsOrder['status'] } : o)
      );
    }
  };

  const handleItemBump = async (orderId: string, itemId: string) => {
    if (!isKitchenMode) return; // Only kitchen can bump items

    const order = displayOrders.find((o) => o.id === orderId);
    const item = order?.items.find((i: KdsOrderItem) => i.id === itemId);

    // Try backend first
    try {
      await api.post(`/api/v1/kds/items/${itemId}/bump`);
    } catch {
      // Demo mode fallback — notification handled below
    }

    // Update local state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          items: o.items.map((i: KdsOrderItem) =>
            i.id === itemId ? { ...i, status: 'READY' as const } : i
          ),
        };
      })
    );

    // Notify mesero
    if (order && item) {
      useNotificationsStore.getState().addReadyItem({
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemId: item.id,
        itemName: item.name,
        tableNumber: order.tableNumber,
        tableName: order.tableName,
        status: 'READY',
        quantity: item.quantity,
      });
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
