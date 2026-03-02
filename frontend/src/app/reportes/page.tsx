'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import api from '@/lib/api';
import RequirePermission from '@/components/common/RequirePermission';

const periodTabs = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Ano' },
];

const CHART_COLORS = ['#D4842A', '#2D5A45', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B'];

export default function ReportesPage() {
  const [period, setPeriod] = useState('today');
  const [isLoading, setIsLoading] = useState(true);

  // Demo data
  const salesByHour = [
    { hour: '11am', sales: 320, orders: 8 },
    { hour: '12pm', sales: 890, orders: 18 },
    { hour: '1pm', sales: 1200, orders: 25 },
    { hour: '2pm', sales: 650, orders: 14 },
    { hour: '3pm', sales: 280, orders: 6 },
    { hour: '4pm', sales: 180, orders: 4 },
    { hour: '5pm', sales: 350, orders: 8 },
    { hour: '6pm', sales: 520, orders: 12 },
    { hour: '7pm', sales: 980, orders: 20 },
    { hour: '8pm', sales: 1450, orders: 30 },
    { hour: '9pm', sales: 1100, orders: 22 },
    { hour: '10pm', sales: 650, orders: 14 },
  ];

  const salesByCategory = [
    { name: 'Sushi Rolls', value: 3200 },
    { name: 'Sashimi', value: 1800 },
    { name: 'Entradas', value: 1200 },
    { name: 'Principales', value: 2100 },
    { name: 'Bebidas', value: 1500 },
    { name: 'Postres', value: 780 },
  ];

  const topProducts = [
    { name: 'Dragon Roll', quantity: 45, revenue: 832.50 },
    { name: 'Salmon Roll', quantity: 38, revenue: 532.00 },
    { name: 'Ramen Tonkotsu', quantity: 32, revenue: 576.00 },
    { name: 'Edamame', quantity: 30, revenue: 240.00 },
    { name: 'Asahi Beer', quantity: 56, revenue: 336.00 },
    { name: 'Rainbow Roll', quantity: 22, revenue: 484.00 },
    { name: 'Gyoza', quantity: 28, revenue: 336.00 },
    { name: 'Miso Soup', quantity: 35, revenue: 227.50 },
  ];

  const paymentBreakdown = [
    { name: 'Efectivo', value: 4200, count: 45 },
    { name: 'Tarjeta', value: 3800, count: 38 },
    { name: 'Yappy', value: 1500, count: 20 },
    { name: 'Transferencia', value: 800, count: 8 },
  ];

  const weeklyTrend = [
    { day: 'Lun', sales: 4500, orders: 65 },
    { day: 'Mar', sales: 3800, orders: 55 },
    { day: 'Mie', sales: 4200, orders: 60 },
    { day: 'Jue', sales: 5100, orders: 72 },
    { day: 'Vie', sales: 7200, orders: 95 },
    { day: 'Sab', sales: 8500, orders: 110 },
    { day: 'Dom', sales: 6800, orders: 88 },
  ];

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [period]);

  const kpis = [
    { label: 'Ventas Totales', value: formatCurrency(10580), change: '+15.2%', positive: true, icon: CurrencyDollarIcon, color: 'bg-emerald-500' },
    { label: 'Ordenes', value: '142', change: '+8.5%', positive: true, icon: ShoppingCartIcon, color: 'bg-maki-gold' },
    { label: 'Ticket Promedio', value: formatCurrency(74.50), change: '+3.1%', positive: true, icon: ArrowTrendingUpIcon, color: 'bg-blue-500' },
    { label: 'Clientes', value: '89', change: '-2.3%', positive: false, icon: UsersIcon, color: 'bg-purple-500' },
  ];

  return (
    <RequirePermission permission="reports">
    <MainLayout>
      <Header
        title="Reportes"
        subtitle="Analisis de ventas y operaciones"
        actions={
          <Tabs
            tabs={periodTabs}
            activeTab={period}
            onChange={setPeriod}
            variant="filled"
            size="sm"
          />
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {isLoading ? (
          <PageLoader />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 max-w-[1400px] mx-auto"
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-maki-gray">{kpi.label}</p>
                      <p className="text-touch-2xl font-bold text-maki-dark mt-1">{kpi.value}</p>
                      <div className={cn('flex items-center gap-1 mt-1', kpi.positive ? 'text-emerald-600' : 'text-red-600')}>
                        <ArrowTrendingUpIcon className={cn('w-4 h-4', !kpi.positive && 'rotate-180')} />
                        <span className="text-xs font-medium">{kpi.change}</span>
                      </div>
                    </div>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', kpi.color)}>
                      <kpi.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales by Hour */}
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Ventas por Hora</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesByHour}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                    />
                    <Bar dataKey="sales" fill="#D4842A" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Weekly Trend */}
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Tendencia Semanal</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                      formatter={(value: number, name: string) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        name === 'sales' ? 'Ventas' : 'Ordenes',
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#D4842A" strokeWidth={3} dot={{ r: 5 }} name="Ventas" />
                    <Line type="monotone" dataKey="orders" stroke="#2D5A45" strokeWidth={2} dot={{ r: 4 }} name="Ordenes" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Sales by Category - Pie */}
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Ventas por Categoria</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {salesByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 12 }}
                      formatter={(value: number) => [formatCurrency(value), 'Ventas']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {salesByCategory.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[idx] }} />
                      <span className="text-maki-gray truncate">{cat.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Products */}
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Top Productos</h3>
                <div className="space-y-2">
                  {topProducts.slice(0, 8).map((product, idx) => (
                    <div key={product.name} className="flex items-center gap-3">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        idx < 3 ? 'bg-maki-gold text-white' : 'bg-gray-100 text-gray-500'
                      )}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-maki-dark truncate">{product.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-maki-dark">{formatCurrency(product.revenue)}</p>
                        <p className="text-xs text-maki-gray">{product.quantity} uds</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Payment breakdown */}
              <Card>
                <h3 className="text-touch-lg font-bold text-maki-dark mb-4">Metodos de Pago</h3>
                <div className="space-y-3">
                  {paymentBreakdown.map((method, idx) => {
                    const total = paymentBreakdown.reduce((s, m) => s + m.value, 0);
                    const pct = ((method.value / total) * 100).toFixed(1);
                    return (
                      <div key={method.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-maki-dark">{method.name}</span>
                          <span className="text-sm text-maki-gray">{pct}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[idx] }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-xs text-maki-gray">{method.count} transacciones</span>
                          <span className="text-xs font-semibold text-maki-dark">{formatCurrency(method.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
    </RequirePermission>
  );
}
