'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
  TicketIcon,
  FireIcon,
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import RequirePermission from '@/components/common/RequirePermission';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatTime, cn } from '@/lib/utils';
import type { KpiSummary, Alert } from '@/types';
import api from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [kpis, setKpis] = useState<KpiSummary>({
    shiftSales: 0,
    activeOrders: 0,
    occupiedTables: 0,
    totalTables: 0,
    averageTicket: 0,
    pendingReservations: 0,
    lowStockItems: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const [kpiRes, alertRes] = await Promise.allSettled([
          api.get('/reports/kpi-summary'),
          api.get('/alerts?limit=5&unread=true'),
        ]);

        if (kpiRes.status === 'fulfilled') {
          setKpis(kpiRes.value.data);
        }
        if (alertRes.status === 'fulfilled') {
          setAlerts(alertRes.value.data.data || alertRes.value.data || []);
        }
      } catch {
        // Use demo data
        setKpis({
          shiftSales: 2847.50,
          activeOrders: 8,
          occupiedTables: 12,
          totalTables: 24,
          averageTicket: 45.30,
          pendingReservations: 3,
          lowStockItems: 2,
        });
        setAlerts([
          { id: '1', type: 'INVENTORY_LOW', title: 'Stock bajo', message: 'Salmon fresco por debajo del minimo', severity: 'WARNING', isRead: false, branchId: '1', createdAt: new Date().toISOString() },
          { id: '2', type: 'RESERVATION', title: 'Reservacion', message: 'Reservacion para 6 personas a las 8:00 PM', severity: 'INFO', isRead: false, branchId: '1', createdAt: new Date().toISOString() },
        ]);
      }
      setIsLoading(false);
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, []);

  const kpiCards = [
    {
      label: 'Ventas del Turno',
      value: formatCurrency(kpis.shiftSales),
      icon: CurrencyDollarIcon,
      color: 'bg-emerald-500',
      trend: '+12%',
    },
    {
      label: 'Ordenes Activas',
      value: kpis.activeOrders.toString(),
      icon: ClipboardDocumentListIcon,
      color: 'bg-maki-gold',
    },
    {
      label: 'Mesas Ocupadas',
      value: `${kpis.occupiedTables}/${kpis.totalTables}`,
      icon: TableCellsIcon,
      color: 'bg-blue-500',
    },
    {
      label: 'Ticket Promedio',
      value: formatCurrency(kpis.averageTicket),
      icon: TicketIcon,
      color: 'bg-purple-500',
    },
  ];

  const quickActions = [
    {
      label: 'Mapa de Mesas',
      icon: TableCellsIcon,
      color: 'bg-emerald-500',
      path: '/mesas',
      description: 'Ver estado de mesas',
    },
    {
      label: 'Nueva Orden',
      icon: ClipboardDocumentListIcon,
      color: 'bg-maki-gold',
      path: '/pedidos',
      description: 'Tomar pedido',
    },
    {
      label: 'Cobrar',
      icon: CreditCardIcon,
      color: 'bg-blue-500',
      path: '/cobro',
      description: 'Procesar pago',
    },
    {
      label: 'Cocina (KDS)',
      icon: FireIcon,
      color: 'bg-orange-500',
      path: '/kds',
      description: 'Ver pantalla cocina',
    },
    {
      label: 'Caja',
      icon: BanknotesIcon,
      color: 'bg-purple-500',
      path: '/cobro',
      description: 'Abrir/cerrar caja',
    },
    {
      label: 'Reservas',
      icon: ClockIcon,
      color: 'bg-pink-500',
      path: '/reservas',
      description: `${kpis.pendingReservations} pendientes`,
    },
  ];

  const severityColors: Record<string, string> = {
    INFO: 'bg-blue-50 border-blue-200 text-blue-700',
    WARNING: 'bg-amber-50 border-amber-200 text-amber-700',
    ERROR: 'bg-red-50 border-red-200 text-red-700',
    CRITICAL: 'bg-red-100 border-red-300 text-red-800',
  };

  return (
    <RequirePermission permission="dashboard">
    <MainLayout>
      <Header
        title={`Hola, ${user?.name.split(' ')[0] || 'Usuario'}`}
        subtitle="Panel de control"
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6 max-w-[1400px] mx-auto"
        >
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi) => (
              <motion.div key={kpi.label} variants={itemVariants}>
                <Card className="relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-maki-gray">{kpi.label}</p>
                      <p className="text-touch-2xl font-bold text-maki-dark mt-1">
                        {kpi.value}
                      </p>
                      {kpi.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs text-emerald-600 font-medium">{kpi.trend}</span>
                        </div>
                      )}
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', kpi.color)}>
                      <kpi.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-touch-lg font-bold text-maki-dark mb-3">Acciones Rapidas</h2>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              {quickActions.map((action) => (
                <motion.button
                  key={action.label}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => router.push(action.path)}
                  className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white shadow-card
                           hover:shadow-card-hover active:shadow-card-active
                           transition-all duration-150 touch-manipulation"
                >
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', action.color)}>
                    <action.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-touch-base font-semibold text-maki-dark">{action.label}</p>
                    <p className="text-xs text-maki-gray mt-0.5">{action.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Bottom Row: Alerts + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alerts */}
            <motion.div variants={itemVariants}>
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-touch-lg font-bold text-maki-dark">Alertas Recientes</h3>
                  {kpis.lowStockItems > 0 && (
                    <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      {kpis.lowStockItems} items bajo stock
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <p className="text-center text-maki-gray py-8">
                      Sin alertas nuevas
                    </p>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          'flex items-start gap-3 p-3 rounded-xl border',
                          severityColors[alert.severity]
                        )}
                      >
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{alert.title}</p>
                          <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
                        </div>
                        <span className="text-xs opacity-60 whitespace-nowrap">
                          {formatTime(alert.createdAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div variants={itemVariants}>
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Resumen del Turno</h3>
                <div className="space-y-4">
                  {/* Occupancy bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-maki-gray">Ocupacion de mesas</span>
                      <span className="text-sm font-bold text-maki-dark">
                        {kpis.totalTables > 0
                          ? Math.round((kpis.occupiedTables / kpis.totalTables) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${kpis.totalTables > 0 ? (kpis.occupiedTables / kpis.totalTables) * 100 : 0}%`,
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-maki-gold rounded-full"
                      />
                    </div>
                  </div>

                  {/* Stats list */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-maki-light rounded-xl">
                      <p className="text-xs text-maki-gray">Ventas Efectivo</p>
                      <p className="text-touch-base font-bold text-maki-dark mt-0.5">
                        {formatCurrency(kpis.shiftSales * 0.6)}
                      </p>
                    </div>
                    <div className="p-3 bg-maki-light rounded-xl">
                      <p className="text-xs text-maki-gray">Ventas Tarjeta</p>
                      <p className="text-touch-base font-bold text-maki-dark mt-0.5">
                        {formatCurrency(kpis.shiftSales * 0.4)}
                      </p>
                    </div>
                    <div className="p-3 bg-maki-light rounded-xl">
                      <p className="text-xs text-maki-gray">Reservas Hoy</p>
                      <p className="text-touch-base font-bold text-maki-dark mt-0.5">
                        {kpis.pendingReservations}
                      </p>
                    </div>
                    <div className="p-3 bg-maki-light rounded-xl">
                      <p className="text-xs text-maki-gray">Ordenes Total</p>
                      <p className="text-touch-base font-bold text-maki-dark mt-0.5">
                        {kpis.activeOrders + Math.floor(kpis.shiftSales / kpis.averageTicket || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
    </RequirePermission>
  );
}
