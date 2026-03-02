'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { cn, formatTimer } from '@/lib/utils';
import type { KdsOrder } from '@/types';

interface KdsOrderCardProps {
  order: KdsOrder;
  onBump?: (orderId: string) => void;
  onItemBump?: (orderId: string, itemId: string) => void;
  lateThresholdMinutes?: number;
}

const statusConfig = {
  NEW: { bg: 'bg-white', border: 'border-gray-200', header: 'bg-gray-50' },
  PREPARING: { bg: 'bg-amber-50', border: 'border-amber-300', header: 'bg-amber-100' },
  READY: { bg: 'bg-emerald-50', border: 'border-emerald-300', header: 'bg-emerald-100' },
  LATE: { bg: 'bg-red-50', border: 'border-red-400', header: 'bg-red-100' },
};

export default function KdsOrderCard({
  order,
  onBump,
  onItemBump,
  lateThresholdMinutes = 15,
}: KdsOrderCardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(order.createdAt).getTime();
    const updateElapsed = () => {
      const secs = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(secs);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isLate = elapsed >= lateThresholdMinutes * 60;
  const effectiveStatus = isLate && order.status !== 'READY' ? 'LATE' : order.status;
  const config = statusConfig[effectiveStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      layout
      className={cn(
        'rounded-2xl border-2 overflow-hidden shadow-card',
        config.bg,
        config.border,
        isLate && 'animate-pulse-soft'
      )}
    >
      {/* Header */}
      <div className={cn('px-4 py-3 flex items-center justify-between', config.header)}>
        <div className="flex items-center gap-3">
          <span className="text-touch-xl font-black text-maki-dark">
            #{order.orderNumber}
          </span>
          {order.tableName && (
            <span className="text-touch-base font-semibold text-maki-gray">
              {order.tableName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLate && (
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          )}
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-lg font-mono font-bold text-touch-lg',
            isLate
              ? 'bg-red-200 text-red-800'
              : elapsed > (lateThresholdMinutes * 60 * 0.7)
              ? 'bg-amber-200 text-amber-800'
              : 'bg-white/60 text-maki-dark'
          )}>
            <ClockIcon className="w-5 h-5" />
            {formatTimer(elapsed)}
          </div>
        </div>
      </div>

      {/* Server */}
      <div className="px-4 py-1 text-xs text-maki-gray border-b border-black/5">
        Mesero: <span className="font-semibold">{order.serverName}</span>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-start justify-between gap-2 py-1',
              item.status === 'READY' && 'opacity-40 line-through'
            )}
          >
            <div className="flex-1">
              <p className="text-touch-lg font-bold text-maki-dark">
                <span className="text-maki-gold mr-2">{item.quantity}x</span>
                {item.name}
              </p>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="ml-8 mt-0.5 space-y-0.5">
                  {item.modifiers.map((mod, idx) => (
                    <p key={idx} className="text-sm text-maki-gray">+ {mod}</p>
                  ))}
                </div>
              )}
              {item.notes && (
                <p className="ml-8 mt-0.5 text-sm font-semibold text-red-600">
                  ** {item.notes}
                </p>
              )}
            </div>
            {item.status !== 'READY' && onItemBump && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onItemBump(order.id, item.id)}
                className="min-w-[40px] min-h-[40px] rounded-lg bg-emerald-100 text-emerald-600
                         flex items-center justify-center hover:bg-emerald-200 transition-colors touch-manipulation"
              >
                <CheckIcon className="w-5 h-5" />
              </motion.button>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <p className="text-sm font-semibold text-yellow-800">
            Nota: {order.notes}
          </p>
        </div>
      )}

      {/* Bump button */}
      {onBump && order.status !== 'READY' && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onBump(order.id)}
          className={cn(
            'w-full min-h-[64px] font-black text-touch-xl uppercase tracking-wide',
            'transition-all duration-150 touch-manipulation',
            effectiveStatus === 'NEW'
              ? 'bg-maki-gold text-white hover:bg-maki-gold/90'
              : effectiveStatus === 'PREPARING'
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-red-600 text-white hover:bg-red-700'
          )}
        >
          {effectiveStatus === 'NEW' ? 'PREPARAR' : 'LISTO'}
        </motion.button>
      )}
    </motion.div>
  );
}
