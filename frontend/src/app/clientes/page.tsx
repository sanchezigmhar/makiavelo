'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  StarIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/ui/SearchBar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, formatCurrency, formatDateShort, getInitials } from '@/lib/utils';
import type { Customer } from '@/types';
import api from '@/lib/api';
import RequirePermission from '@/components/common/RequirePermission';

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const demoCustomers: Customer[] = [
    { id: 'c1', name: 'Roberto Fernandez', email: 'roberto@email.com', phone: '+507 6123-4567', loyaltyPoints: 450, totalSpent: 1250.00, visitCount: 15, lastVisit: new Date(Date.now() - 2 * 86400000).toISOString(), tags: ['VIP', 'Cumpleanos Enero'], isActive: true, createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
    { id: 'c2', name: 'Laura Gonzalez', email: 'laura@email.com', phone: '+507 6234-5678', loyaltyPoints: 280, totalSpent: 780.00, visitCount: 8, lastVisit: new Date(Date.now() - 7 * 86400000).toISOString(), isActive: true, createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
    { id: 'c3', name: 'Miguel Castillo', phone: '+507 6345-6789', loyaltyPoints: 1200, totalSpent: 3500.00, visitCount: 32, lastVisit: new Date(Date.now() - 1 * 86400000).toISOString(), tags: ['VIP', 'Corporativo'], isActive: true, createdAt: new Date(Date.now() - 365 * 86400000).toISOString() },
    { id: 'c4', name: 'Ana Sofia Rivera', email: 'anasofia@email.com', loyaltyPoints: 150, totalSpent: 420.00, visitCount: 5, lastVisit: new Date(Date.now() - 14 * 86400000).toISOString(), isActive: true, createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
    { id: 'c5', name: 'Pedro Morales', phone: '+507 6456-7890', loyaltyPoints: 80, totalSpent: 220.00, visitCount: 3, isActive: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
    { id: 'c6', name: 'Carolina Jimenez', email: 'carolina@empresa.com', phone: '+507 6567-8901', loyaltyPoints: 650, totalSpent: 1800.00, visitCount: 20, lastVisit: new Date(Date.now() - 3 * 86400000).toISOString(), tags: ['Frecuente'], isActive: true, createdAt: new Date(Date.now() - 200 * 86400000).toISOString() },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/customers?limit=100');
        setCustomers(data.data || data);
      } catch {
        setCustomers(demoCustomers);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displayCustomers = customers.length > 0 ? customers : demoCustomers;

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return displayCustomers;
    const q = searchQuery.toLowerCase();
    return displayCustomers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  }, [displayCustomers, searchQuery]);

  const getTier = (points: number) => {
    if (points >= 1000) return { label: 'Platino', color: 'bg-purple-100 text-purple-700' };
    if (points >= 500) return { label: 'Oro', color: 'bg-amber-100 text-amber-700' };
    if (points >= 200) return { label: 'Plata', color: 'bg-gray-200 text-gray-700' };
    return { label: 'Bronce', color: 'bg-orange-100 text-orange-700' };
  };

  return (
    <RequirePermission permission="customers">
    <MainLayout>
      <Header
        title="Clientes"
        subtitle={`${displayCustomers.length} clientes registrados`}
        actions={
          <Button variant="primary" size="md" icon={<PlusIcon className="w-5 h-5" />}>
            Nuevo Cliente
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 pt-4 pb-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar cliente..." />
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          {isLoading ? (
            <PageLoader />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredCustomers.map((customer) => {
                const tier = getTier(customer.loyaltyPoints);
                return (
                  <motion.button
                    key={customer.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedCustomer(customer); setShowDetail(true); }}
                    className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card
                             text-left transition-all touch-manipulation hover:shadow-card-hover"
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-maki-gold flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{getInitials(customer.name)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-maki-dark truncate">{customer.name}</p>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', tier.color)}>
                          {tier.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-maki-gray mt-0.5">
                        <span>{customer.visitCount} visitas</span>
                        <span>{formatCurrency(customer.totalSpent)} gastado</span>
                      </div>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {customer.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-maki-gold">
                        <StarIcon className="w-4 h-4" />
                        <span className="font-bold">{customer.loyaltyPoints}</span>
                      </div>
                      <p className="text-xs text-maki-gray">puntos</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Detalle del Cliente"
        size="md"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            {/* Profile header */}
            <div className="text-center p-6 bg-maki-light rounded-xl">
              <div className="w-20 h-20 rounded-full bg-maki-gold flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-2xl">{getInitials(selectedCustomer.name)}</span>
              </div>
              <h3 className="text-touch-xl font-bold text-maki-dark">{selectedCustomer.name}</h3>
              <span className={cn('text-sm font-semibold px-3 py-1 rounded-full mt-2 inline-block',
                getTier(selectedCustomer.loyaltyPoints).color)}>
                {getTier(selectedCustomer.loyaltyPoints).label} - {selectedCustomer.loyaltyPoints} puntos
              </span>
            </div>

            {/* Contact info */}
            <div className="space-y-2">
              {selectedCustomer.email && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <EnvelopeIcon className="w-5 h-5 text-maki-gray" />
                  <span className="text-maki-dark">{selectedCustomer.email}</span>
                </div>
              )}
              {selectedCustomer.phone && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <PhoneIcon className="w-5 h-5 text-maki-gray" />
                  <span className="text-maki-dark">{selectedCustomer.phone}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                <CurrencyDollarIcon className="w-5 h-5 text-maki-gold mx-auto mb-1" />
                <p className="text-touch-base font-bold text-maki-dark">{formatCurrency(selectedCustomer.totalSpent)}</p>
                <p className="text-xs text-maki-gray">Total gastado</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                <UserIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-touch-base font-bold text-maki-dark">{selectedCustomer.visitCount}</p>
                <p className="text-xs text-maki-gray">Visitas</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 text-center">
                <CalendarIcon className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-touch-base font-bold text-maki-dark">
                  {selectedCustomer.lastVisit ? formatDateShort(selectedCustomer.lastVisit) : 'N/A'}
                </p>
                <p className="text-xs text-maki-gray">Ultima visita</p>
              </div>
            </div>

            {/* Notes */}
            {selectedCustomer.notes && (
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-sm text-amber-800">{selectedCustomer.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </MainLayout>
    </RequirePermission>
  );
}
