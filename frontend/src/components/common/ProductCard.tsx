'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { cn, formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onAdd?: (product: Product) => void;
  showImage?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export default function ProductCard({
  product,
  onAdd,
  showImage = true,
  compact = false,
  disabled = false,
}: ProductCardProps) {
  const isUnavailable = !product.isAvailable || disabled;

  return (
    <motion.button
      whileTap={{ scale: isUnavailable ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      onClick={() => !isUnavailable && onAdd?.(product)}
      disabled={isUnavailable}
      className={cn(
        'w-full rounded-2xl bg-white shadow-card text-left transition-all duration-150 touch-manipulation',
        'hover:shadow-card-hover active:shadow-card-active',
        isUnavailable && 'opacity-50 cursor-not-allowed',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Image placeholder */}
      {showImage && (
        <div className={cn(
          'bg-maki-cream/50 rounded-xl mb-3 flex items-center justify-center overflow-hidden',
          compact ? 'h-20' : 'h-28'
        )}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl">
              {product.courseType === 'BEBIDA' ? '🍵' :
               product.courseType === 'ENTRADA' ? '🥗' :
               product.courseType === 'POSTRE' ? '🍮' :
               '🍣'}
            </span>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-semibold text-maki-dark truncate',
            compact ? 'text-sm' : 'text-touch-base'
          )}>
            {product.name}
          </p>
          {product.description && !compact && (
            <p className="text-xs text-maki-gray mt-0.5 line-clamp-2">
              {product.description}
            </p>
          )}
          <p className={cn(
            'font-bold text-maki-gold mt-1',
            compact ? 'text-sm' : 'text-touch-base'
          )}>
            {formatCurrency(product.price)}
          </p>
        </div>

        {/* Add button */}
        {onAdd && !isUnavailable && (
          <div className={cn(
            'rounded-xl bg-maki-gold text-white flex items-center justify-center flex-shrink-0',
            compact ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            <PlusIcon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
          </div>
        )}
      </div>

      {/* Unavailable badge */}
      {!product.isAvailable && (
        <div className="mt-2 px-2 py-1 bg-red-50 rounded-lg text-center">
          <span className="text-xs font-semibold text-red-600">No disponible</span>
        </div>
      )}

      {/* Modifiers indicator */}
      {product.modifierGroups && product.modifierGroups.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs text-maki-gray">Personalizable</span>
          <div className="w-1.5 h-1.5 rounded-full bg-maki-gold" />
        </div>
      )}
    </motion.button>
  );
}
