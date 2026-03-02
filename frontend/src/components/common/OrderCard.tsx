'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  UserIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { cn, formatCurrency, formatElapsedTime, timeAgo } from '@/lib/utils';
import type { Order } from '@/types';
import StatusPill from '@/components/ui/StatusPill';

interface OrderCardProps {
  order: Order;
  onClick?: (order: Order) => void;
  compact?: boolean;
  showItems?: boolean;
}

export default function OrderCard({
  order,
  onClick,
  compact = false,
  showItems = true,
}: OrderCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      onClick={() => onClick?.(order)}
      className={cn(
        'w-full rounded-2xl bg-white shadow-card text-left transition-all duration-150 touch-manipulation',
        'hover:shadow-card-hover active:shadow-card-active',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className={cn(
            'font-bold text-maki-dark',
            compact ? 'text-touch-base' : 'text-touch-lg'
          )}>
            #{order.orderNumber}
          </span>
          <div className="flex items-center gap-2 mt-0.5 text-sm text-maki-gray">
            {order.table && (
              <span className="flex items-center gap-1">
                <TableCellsIcon className="w-3.5 h-3.5" />
                Mesa {order.table.number}
              </span>
            )}
            {order.user && (
              <span className="flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5" />
                {order.user.name.split(' ')[0]}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusPill status={order.status} size="sm" />
          <span className="text-xs text-maki-gray flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {timeAgo(order.createdAt)}
          </span>
        </div>
      </div>

      {/* Items preview */}
      {showItems && order.items && order.items.length > 0 && (
        <div className="mb-2 space-y-1">
          {order.items.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-maki-gray">
                <span className="font-medium text-maki-dark">{item.quantity}x</span>{' '}
                {item.name}
              </span>
              <span className="text-maki-gray font-medium">
                {formatCurrency(item.totalPrice)}
              </span>
            </div>
          ))}
          {order.items.length > (compact ? 2 : 4) && (
            <p className="text-xs text-maki-gray">
              +{order.items.length - (compact ? 2 : 4)} items mas
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-sm text-maki-gray">
          {order.items?.length || 0} items
        </span>
        <span className={cn(
          'font-bold text-maki-dark',
          compact ? 'text-touch-base' : 'text-touch-lg'
        )}>
          {formatCurrency(order.total)}
        </span>
      </div>
    </motion.button>
  );
}
