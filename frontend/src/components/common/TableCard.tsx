'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { cn, formatCurrency, formatElapsedTime, tableStatusConfig } from '@/lib/utils';
import type { Table, TableStatus } from '@/types';
import StatusPill from '@/components/ui/StatusPill';

interface TableCardProps {
  table: Table;
  onClick?: (table: Table) => void;
  compact?: boolean;
}

const statusBorderColors: Record<TableStatus, string> = {
  AVAILABLE: 'border-l-emerald-500',
  OCCUPIED: 'border-l-orange-500',
  RESERVED: 'border-l-blue-500',
  CLEANING: 'border-l-gray-400',
  BLOCKED: 'border-l-red-500',
};

const statusBgColors: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-50/50',
  OCCUPIED: 'bg-orange-50/50',
  RESERVED: 'bg-blue-50/50',
  CLEANING: 'bg-gray-50',
  BLOCKED: 'bg-red-50/50',
};

export default function TableCard({ table, onClick, compact = false }: TableCardProps) {
  const config = tableStatusConfig[table.status];

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.1 }}
      onClick={() => onClick?.(table)}
      className={cn(
        'w-full rounded-2xl border-l-4 shadow-card transition-all duration-150 touch-manipulation text-left',
        'hover:shadow-card-hover active:shadow-card-active',
        statusBorderColors[table.status],
        statusBgColors[table.status],
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Top row: number + status */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={cn(
            'font-bold text-maki-dark',
            compact ? 'text-touch-lg' : 'text-touch-2xl'
          )}>
            {table.name || `Mesa ${table.number}`}
          </span>
          {table.zone && (
            <p className="text-xs text-maki-gray mt-0.5">{table.zone.name}</p>
          )}
        </div>
        <StatusPill status={table.status} size="sm" />
      </div>

      {/* Info */}
      <div className={cn(
        'grid gap-2 text-sm text-maki-gray',
        compact ? 'grid-cols-2' : 'grid-cols-2'
      )}>
        {/* Capacity */}
        <div className="flex items-center gap-1.5">
          <UserIcon className="w-4 h-4" />
          <span>{table.capacity} pers.</span>
        </div>

        {/* Occupied time */}
        {table.status === 'OCCUPIED' && table.occupiedAt && (
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-orange-500" />
            <span className="text-orange-600 font-medium">
              {formatElapsedTime(table.occupiedAt)}
            </span>
          </div>
        )}

        {/* Current total */}
        {table.status === 'OCCUPIED' && table.currentOrder && (
          <div className="flex items-center gap-1.5">
            <CurrencyDollarIcon className="w-4 h-4 text-maki-gold" />
            <span className="text-maki-dark font-semibold">
              {formatCurrency(table.currentOrder.total)}
            </span>
          </div>
        )}

        {/* Server */}
        {table.assignedUser && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-maki-gold/20 flex items-center justify-center">
              <span className="text-[8px] font-bold text-maki-gold">
                {table.assignedUser.name.charAt(0)}
              </span>
            </div>
            <span className="truncate">{table.assignedUser.name.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
