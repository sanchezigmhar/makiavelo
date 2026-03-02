'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showDelete?: boolean;
  onDelete?: () => void;
  className?: string;
}

export default function QuantitySelector({
  value,
  onChange,
  min = 0,
  max = 99,
  size = 'md',
  showDelete = true,
  onDelete,
  className,
}: QuantitySelectorProps) {
  const sizes = {
    sm: { btn: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-base w-8' },
    md: { btn: 'w-12 h-12', icon: 'w-5 h-5', text: 'text-touch-lg w-10' },
    lg: { btn: 'w-14 h-14', icon: 'w-6 h-6', text: 'text-touch-xl w-12' },
  };

  const s = sizes[size];
  const canDecrement = value > min;
  const canIncrement = value < max;
  const isAtMin = value <= min && showDelete;

  const handleDecrement = () => {
    if (value <= min) {
      onDelete?.();
    } else {
      onChange(value - 1);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleDecrement}
        disabled={!canDecrement && !isAtMin}
        className={cn(
          'rounded-xl flex items-center justify-center transition-all touch-manipulation',
          s.btn,
          isAtMin && canDecrement === false
            ? 'bg-red-50 text-maki-red hover:bg-red-100 active:bg-red-200'
            : canDecrement
            ? 'bg-gray-100 text-maki-dark hover:bg-gray-200 active:bg-gray-300'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        )}
      >
        {isAtMin && !canDecrement ? (
          <TrashIcon className={s.icon} />
        ) : (
          <MinusIcon className={s.icon} />
        )}
      </motion.button>

      <span
        className={cn(
          'font-bold text-center tabular-nums text-maki-dark select-none',
          s.text
        )}
      >
        {value}
      </span>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => canIncrement && onChange(value + 1)}
        disabled={!canIncrement}
        className={cn(
          'rounded-xl flex items-center justify-center transition-all touch-manipulation',
          s.btn,
          canIncrement
            ? 'bg-maki-gold text-white hover:bg-maki-gold/90 active:bg-maki-gold/80'
            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
        )}
      >
        <PlusIcon className={s.icon} />
      </motion.button>
    </div>
  );
}
