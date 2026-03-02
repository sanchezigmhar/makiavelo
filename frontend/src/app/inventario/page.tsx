'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  PlusIcon,
  MinusIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/ui/SearchBar';
import Tabs from '@/components/ui/Tabs';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import NumPad from '@/components/ui/NumPad';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import type { Supply } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import RequirePermission from '@/components/common/RequirePermission';

const filterTabs = [
  { id: 'all', label: 'Todos' },
  { id: 'low', label: 'Stock Bajo', count: 0 },
  { id: 'normal', label: 'Normal' },
  { id: 'excess', label: 'Exceso' },
];

export default function InventarioPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');

  // Demo supplies
  const demoSupplies: Supply[] = [
    { id: 's1', name: 'Salmon Fresco', sku: 'INV-001', unit: 'kg', currentStock: 3.5, minStock: 5, maxStock: 20, cost: 28.00, isActive: true },
    { id: 's2', name: 'Arroz para Sushi', sku: 'INV-002', unit: 'kg', currentStock: 15, minStock: 10, maxStock: 50, cost: 4.50, isActive: true },
    { id: 's3', name: 'Aguacate', sku: 'INV-003', unit: 'und', currentStock: 8, minStock: 10, maxStock: 30, cost: 1.50, isActive: true },
    { id: 's4', name: 'Nori (Alga)', sku: 'INV-004', unit: 'paq', currentStock: 25, minStock: 10, maxStock: 50, cost: 3.00, isActive: true },
    { id: 's5', name: 'Atun Fresco', sku: 'INV-005', unit: 'kg', currentStock: 2.0, minStock: 4, maxStock: 15, cost: 35.00, isActive: true },
    { id: 's6', name: 'Camarones', sku: 'INV-006', unit: 'kg', currentStock: 5.0, minStock: 3, maxStock: 12, cost: 22.00, isActive: true },
    { id: 's7', name: 'Salsa Soya', sku: 'INV-007', unit: 'lt', currentStock: 8, minStock: 5, maxStock: 20, cost: 6.00, isActive: true },
    { id: 's8', name: 'Vinagre de Arroz', sku: 'INV-008', unit: 'lt', currentStock: 4, minStock: 3, maxStock: 10, cost: 5.50, isActive: true },
    { id: 's9', name: 'Jengibre Fresco', sku: 'INV-009', unit: 'kg', currentStock: 1.2, minStock: 2, maxStock: 8, cost: 12.00, isActive: true },
    { id: 's10', name: 'Wasabi', sku: 'INV-010', unit: 'kg', currentStock: 0.8, minStock: 1, maxStock: 5, cost: 45.00, isActive: true },
    { id: 's11', name: 'Cerveza Asahi', sku: 'INV-011', unit: 'und', currentStock: 48, minStock: 24, maxStock: 96, cost: 1.80, isActive: true },
    { id: 's12', name: 'Sake Premium', sku: 'INV-012', unit: 'bot', currentStock: 6, minStock: 4, maxStock: 12, cost: 18.00, isActive: true },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/supplies?limit=200');
        setSupplies(data.data || data);
      } catch {
        setSupplies(demoSupplies);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displaySupplies = supplies.length > 0 ? supplies : demoSupplies;

  const filteredSupplies = useMemo(() => {
    let result = displaySupplies;

    if (activeFilter === 'low') {
      result = result.filter((s) => s.currentStock <= s.minStock);
    } else if (activeFilter === 'normal') {
      result = result.filter((s) => s.currentStock > s.minStock && (!s.maxStock || s.currentStock <= s.maxStock));
    } else if (activeFilter === 'excess') {
      result = result.filter((s) => s.maxStock && s.currentStock > s.maxStock);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) || s.sku?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [displaySupplies, activeFilter, searchQuery]);

  const lowStockCount = displaySupplies.filter((s) => s.currentStock <= s.minStock).length;
  const updatedTabs = filterTabs.map((t) =>
    t.id === 'low' ? { ...t, count: lowStockCount } : t
  );

  const getStockLevel = (supply: Supply) => {
    if (supply.currentStock <= supply.minStock) return 'low';
    if (supply.maxStock && supply.currentStock >= supply.maxStock) return 'excess';
    return 'normal';
  };

  const stockPercentage = (supply: Supply) => {
    const max = supply.maxStock || supply.minStock * 3;
    return Math.min((supply.currentStock / max) * 100, 100);
  };

  const handleAdjust = async () => {
    if (!selectedSupply) return;
    const qty = parseFloat(adjustValue);
    if (isNaN(qty) || qty <= 0) return;

    try {
      await api.post('/inventory/movements', {
        supplyId: selectedSupply.id,
        type: adjustType,
        quantity: qty,
        reason: adjustType === 'IN' ? 'Recepcion de inventario' : 'Ajuste de inventario',
      });
    } catch {
      // Demo mode
    }

    setSupplies((prev) =>
      prev.map((s) => {
        if (s.id !== selectedSupply.id) return s;
        return {
          ...s,
          currentStock: adjustType === 'IN'
            ? s.currentStock + qty
            : Math.max(0, s.currentStock - qty),
        };
      })
    );

    toast.success(adjustType === 'IN' ? `+${qty} ${selectedSupply.unit} agregados` : `-${qty} ${selectedSupply.unit} removidos`);
    setShowAdjust(false);
    setSelectedSupply(null);
    setAdjustValue('');
  };

  return (
    <RequirePermission permission="inventory">
    <MainLayout>
      <Header
        title="Inventario"
        subtitle={`${displaySupplies.length} items | ${lowStockCount} con stock bajo`}
        actions={
          <Button variant="primary" size="md" icon={<PlusIcon className="w-5 h-5" />}>
            Agregar Item
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 pt-4 pb-2 space-y-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar insumo..." />
          <Tabs tabs={updatedTabs} activeTab={activeFilter} onChange={setActiveFilter} variant="pills" size="sm" />
        </div>

        {/* Summary cards */}
        <div className="px-6 pb-3 grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <p className="text-xs text-maki-gray">Total Items</p>
            <p className="text-touch-lg font-bold text-maki-dark">{displaySupplies.length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl shadow-sm">
            <p className="text-xs text-red-600">Stock Bajo</p>
            <p className="text-touch-lg font-bold text-red-700">{lowStockCount}</p>
          </div>
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <p className="text-xs text-maki-gray">Valor Total</p>
            <p className="text-touch-lg font-bold text-maki-dark">
              {formatCurrency(displaySupplies.reduce((sum, s) => sum + s.currentStock * s.cost, 0))}
            </p>
          </div>
        </div>

        {/* Supply list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="space-y-2">
              {filteredSupplies.map((supply) => {
                const level = getStockLevel(supply);
                return (
                  <motion.div
                    key={supply.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card"
                  >
                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                      level === 'low' ? 'bg-red-100' : level === 'excess' ? 'bg-amber-100' : 'bg-emerald-100'
                    )}>
                      {level === 'low' ? (
                        <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
                      ) : level === 'excess' ? (
                        <ArrowTrendingUpIcon className="w-6 h-6 text-amber-600" />
                      ) : (
                        <AdjustmentsHorizontalIcon className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-maki-dark truncate">{supply.name}</h3>
                        {level === 'low' && (
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-maki-gray">
                        Min: {supply.minStock} {supply.unit} | Costo: {formatCurrency(supply.cost)}/{supply.unit}
                      </p>
                      {/* Stock bar */}
                      <div className="mt-1.5 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            level === 'low' ? 'bg-red-500' : level === 'excess' ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                          style={{ width: `${stockPercentage(supply)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stock value */}
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        'text-touch-lg font-bold',
                        level === 'low' ? 'text-red-600' : 'text-maki-dark'
                      )}>
                        {formatNumber(supply.currentStock)}
                      </p>
                      <p className="text-xs text-maki-gray">{supply.unit}</p>
                    </div>

                    {/* Adjust buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedSupply(supply);
                          setAdjustType('IN');
                          setAdjustValue('');
                          setShowAdjust(true);
                        }}
                        className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600
                                 flex items-center justify-center hover:bg-emerald-100 touch-manipulation"
                      >
                        <PlusIcon className="w-5 h-5" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          setSelectedSupply(supply);
                          setAdjustType('OUT');
                          setAdjustValue('');
                          setShowAdjust(true);
                        }}
                        className="w-10 h-10 rounded-lg bg-red-50 text-red-600
                                 flex items-center justify-center hover:bg-red-100 touch-manipulation"
                      >
                        <MinusIcon className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjust}
        onClose={() => setShowAdjust(false)}
        title={`${adjustType === 'IN' ? 'Entrada' : 'Salida'}: ${selectedSupply?.name}`}
        size="sm"
        footer={
          <Button
            variant={adjustType === 'IN' ? 'success' : 'danger'}
            size="lg"
            fullWidth
            onClick={handleAdjust}
            disabled={!adjustValue || parseFloat(adjustValue) <= 0}
          >
            {adjustType === 'IN' ? 'Registrar Entrada' : 'Registrar Salida'}
          </Button>
        }
      >
        {selectedSupply && (
          <div>
            <div className="text-center mb-4 p-3 bg-maki-light rounded-xl">
              <p className="text-sm text-maki-gray">Stock actual</p>
              <p className="text-touch-xl font-bold text-maki-dark">
                {formatNumber(selectedSupply.currentStock)} {selectedSupply.unit}
              </p>
            </div>
            <NumPad
              value={adjustValue}
              onChange={setAdjustValue}
              label={`Cantidad (${selectedSupply.unit})`}
              showCurrency={false}
              showDecimal
            />
          </div>
        )}
      </Modal>
    </MainLayout>
    </RequirePermission>
  );
}
