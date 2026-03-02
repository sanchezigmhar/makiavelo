'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusPill from '@/components/ui/StatusPill';
import SearchBar from '@/components/ui/SearchBar';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { Reservation, ReservationStatus } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, addDays, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import RequirePermission from '@/components/common/RequirePermission';

const statusTabs = [
  { id: 'all', label: 'Todas' },
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'CONFIRMED', label: 'Confirmadas' },
  { id: 'SEATED', label: 'Sentados' },
  { id: 'COMPLETED', label: 'Completadas' },
  { id: 'NO_SHOW', label: 'No Show' },
];

export default function ReservasPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeStatus, setActiveStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const today = new Date();

  const demoReservations: Reservation[] = [
    { id: 'r1', customerName: 'Roberto Fernandez', customerPhone: '+507 6123-4567', date: format(today, 'yyyy-MM-dd'), time: '18:00', guestCount: 4, status: 'CONFIRMED', notes: 'Cumpleanos, traer pastel', branchId: '1', createdAt: today.toISOString() },
    { id: 'r2', customerName: 'Laura Gonzalez', customerPhone: '+507 6234-5678', date: format(today, 'yyyy-MM-dd'), time: '19:30', guestCount: 2, status: 'PENDING', branchId: '1', createdAt: today.toISOString() },
    { id: 'r3', customerName: 'Miguel Castillo', customerPhone: '+507 6345-6789', date: format(today, 'yyyy-MM-dd'), time: '20:00', guestCount: 8, status: 'CONFIRMED', notes: 'Mesa VIP, cena de negocios', branchId: '1', createdAt: today.toISOString() },
    { id: 'r4', customerName: 'Ana Sofia Rivera', date: format(today, 'yyyy-MM-dd'), time: '12:30', guestCount: 3, status: 'SEATED', branchId: '1', createdAt: today.toISOString() },
    { id: 'r5', customerName: 'Pedro Morales', date: format(today, 'yyyy-MM-dd'), time: '13:00', guestCount: 6, status: 'COMPLETED', branchId: '1', createdAt: today.toISOString() },
    { id: 'r6', customerName: 'Carolina Jimenez', customerPhone: '+507 6456-7890', date: format(addDays(today, 1), 'yyyy-MM-dd'), time: '19:00', guestCount: 4, status: 'CONFIRMED', branchId: '1', createdAt: today.toISOString() },
    { id: 'r7', customerName: 'Eduardo Perez', date: format(addDays(today, 1), 'yyyy-MM-dd'), time: '20:30', guestCount: 2, status: 'PENDING', branchId: '1', createdAt: today.toISOString() },
    { id: 'r8', customerName: 'No Show Client', date: format(today, 'yyyy-MM-dd'), time: '11:00', guestCount: 2, status: 'NO_SHOW', branchId: '1', createdAt: today.toISOString() },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/reservations');
        setReservations(data.data || data);
      } catch {
        setReservations(demoReservations);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const displayReservations = reservations.length > 0 ? reservations : demoReservations;

  const filteredReservations = useMemo(() => {
    let result = displayReservations;
    if (activeStatus !== 'all') {
      result = result.filter((r) => r.status === activeStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) =>
        r.customerName.toLowerCase().includes(q) || r.customerPhone?.includes(q)
      );
    }
    return result.sort((a, b) => {
      const dateA = `${a.date}T${a.time}`;
      const dateB = `${b.date}T${b.time}`;
      return dateA.localeCompare(dateB);
    });
  }, [displayReservations, activeStatus, searchQuery]);

  // Group by date
  const groupedReservations = useMemo(() => {
    const groups: Record<string, Reservation[]> = {};
    filteredReservations.forEach((r) => {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });
    return groups;
  }, [filteredReservations]);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoy';
    if (isTomorrow(date)) return 'Manana';
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  };

  const handleStatusChange = async (reservation: Reservation, status: ReservationStatus) => {
    try {
      await api.patch(`/reservations/${reservation.id}`, { status });
    } catch {
      // demo
    }
    setReservations((prev) =>
      prev.map((r) => r.id === reservation.id ? { ...r, status } : r)
    );
    toast.success(`Reservacion ${status === 'CONFIRMED' ? 'confirmada' : status === 'SEATED' ? 'sentada' : 'actualizada'}`);
    setShowDetail(false);
  };

  const todayCount = displayReservations.filter((r) => r.date === format(today, 'yyyy-MM-dd') && r.status !== 'CANCELLED').length;
  const pendingCount = displayReservations.filter((r) => r.status === 'PENDING').length;
  const totalGuests = displayReservations
    .filter((r) => r.date === format(today, 'yyyy-MM-dd') && ['CONFIRMED', 'PENDING', 'SEATED'].includes(r.status))
    .reduce((sum, r) => sum + r.guestCount, 0);

  return (
    <RequirePermission permission="reservations">
    <MainLayout>
      <Header
        title="Reservaciones"
        subtitle={`${todayCount} hoy | ${pendingCount} pendientes`}
        actions={
          <Button variant="primary" size="md" icon={<PlusIcon className="w-5 h-5" />}>
            Nueva Reserva
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 pt-4 pb-2 space-y-3">
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Buscar por nombre o telefono..." />
          <Tabs tabs={statusTabs} activeTab={activeStatus} onChange={setActiveStatus} variant="pills" size="sm" />
        </div>

        {/* Summary */}
        <div className="px-6 pb-3 grid grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-xl shadow-sm text-center">
            <CalendarDaysIcon className="w-5 h-5 text-maki-gold mx-auto mb-1" />
            <p className="text-touch-lg font-bold text-maki-dark">{todayCount}</p>
            <p className="text-xs text-maki-gray">Hoy</p>
          </div>
          <div className="p-3 bg-white rounded-xl shadow-sm text-center">
            <UserGroupIcon className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-touch-lg font-bold text-maki-dark">{totalGuests}</p>
            <p className="text-xs text-maki-gray">Comensales</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl shadow-sm text-center">
            <ClockIcon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-touch-lg font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600">Pendientes</p>
          </div>
        </div>

        {/* Reservations list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6">
          {isLoading ? (
            <PageLoader />
          ) : (
            Object.entries(groupedReservations).map(([date, reservs]) => (
              <div key={date} className="mb-6">
                <h3 className="text-touch-base font-bold text-maki-dark mb-2 capitalize">
                  {getDateLabel(date)}
                </h3>
                <div className="space-y-2">
                  {reservs.map((reservation) => (
                    <motion.button
                      key={reservation.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedReservation(reservation); setShowDetail(true); }}
                      className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl shadow-card
                               text-left transition-all touch-manipulation hover:shadow-card-hover"
                    >
                      {/* Time */}
                      <div className="text-center flex-shrink-0 w-16">
                        <p className="text-touch-lg font-bold text-maki-dark">{reservation.time}</p>
                      </div>

                      {/* Separator */}
                      <div className="w-px h-12 bg-gray-200 flex-shrink-0" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-maki-dark truncate">{reservation.customerName}</p>
                        <div className="flex items-center gap-3 text-sm text-maki-gray mt-0.5">
                          <span className="flex items-center gap-1">
                            <UserGroupIcon className="w-3.5 h-3.5" />
                            {reservation.guestCount} pers.
                          </span>
                          {reservation.customerPhone && (
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="w-3.5 h-3.5" />
                              {reservation.customerPhone}
                            </span>
                          )}
                        </div>
                        {reservation.notes && (
                          <p className="text-xs text-maki-gold mt-0.5 truncate">
                            {reservation.notes}
                          </p>
                        )}
                      </div>

                      <StatusPill status={reservation.status} size="sm" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="Reservacion"
        size="sm"
      >
        {selectedReservation && (
          <div className="space-y-4">
            <div className="text-center p-4 bg-maki-light rounded-xl">
              <p className="text-touch-2xl font-bold text-maki-dark">{selectedReservation.customerName}</p>
              <p className="text-maki-gray mt-1">
                {getDateLabel(selectedReservation.date)} a las {selectedReservation.time}
              </p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-maki-gray">
                  <UserGroupIcon className="w-4 h-4" />
                  {selectedReservation.guestCount} personas
                </span>
                <StatusPill status={selectedReservation.status} />
              </div>
            </div>

            {selectedReservation.notes && (
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-sm font-medium text-amber-800">Notas: {selectedReservation.notes}</p>
              </div>
            )}

            {selectedReservation.customerPhone && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                <PhoneIcon className="w-5 h-5 text-maki-gray" />
                <span className="text-maki-dark font-medium">{selectedReservation.customerPhone}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {selectedReservation.status === 'PENDING' && (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  icon={<CheckCircleIcon className="w-5 h-5" />}
                  onClick={() => handleStatusChange(selectedReservation, 'CONFIRMED')}
                >
                  Confirmar
                </Button>
              )}
              {(selectedReservation.status === 'CONFIRMED' || selectedReservation.status === 'PENDING') && (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<UserGroupIcon className="w-5 h-5" />}
                  onClick={() => handleStatusChange(selectedReservation, 'SEATED')}
                >
                  Sentar
                </Button>
              )}
              {selectedReservation.status === 'SEATED' && (
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => handleStatusChange(selectedReservation, 'COMPLETED')}
                >
                  Completar
                </Button>
              )}
              {selectedReservation.status !== 'CANCELLED' && selectedReservation.status !== 'COMPLETED' && (
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  icon={<XCircleIcon className="w-5 h-5" />}
                  onClick={() => handleStatusChange(selectedReservation, 'CANCELLED')}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </MainLayout>
    </RequirePermission>
  );
}
