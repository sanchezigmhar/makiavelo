'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusPillProps {
  status: string;
  config?: Record<string, { label: string; color: string; bgColor: string }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  AVAILABLE: { label: 'Disponible', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  OCCUPIED: { label: 'Ocupada', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  RESERVED: { label: 'Reservada', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  CLEANING: { label: 'Limpieza', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  BLOCKED: { label: 'Bloqueada', color: 'text-red-700', bgColor: 'bg-red-100' },
  OPEN: { label: 'Abierta', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  IN_PROGRESS: { label: 'En preparacion', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  READY: { label: 'Lista', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  DELIVERED: { label: 'Entregada', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  CLOSED: { label: 'Cerrada', color: 'text-maki-dark', bgColor: 'bg-maki-cream' },
  CANCELLED: { label: 'Cancelada', color: 'text-red-700', bgColor: 'bg-red-100' },
  PENDING: { label: 'Pendiente', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  CONFIRMED: { label: 'Confirmada', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  COMPLETED: { label: 'Completada', color: 'text-maki-dark', bgColor: 'bg-maki-cream' },
  NO_SHOW: { label: 'No se presento', color: 'text-red-700', bgColor: 'bg-red-100' },
  PREPARING: { label: 'Preparando', color: 'text-amber-700', bgColor: 'bg-amber-100' },
};

const sizeStyles: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export default function StatusPill({
  status,
  config = defaultConfig,
  size = 'md',
  className,
}: StatusPillProps) {
  const statusConfig = config[status] || {
    label: status,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap',
        statusConfig.bgColor,
        statusConfig.color,
        sizeStyles[size],
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          statusConfig.color.replace('text-', 'bg-')
        )}
      />
      {statusConfig.label}
    </span>
  );
}
