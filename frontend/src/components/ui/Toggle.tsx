'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'lg',
  className,
}: ToggleProps) {
  const sizes = {
    md: { track: 'w-12 h-7', thumb: 'w-5 h-5', translate: 'translate-x-[22px]' },
    lg: { track: 'w-16 h-9', thumb: 'w-7 h-7', translate: 'translate-x-[30px]' },
  };

  const s = sizes[size];

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 touch-manipulation min-h-[48px]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        className={cn(
          'relative rounded-full transition-colors duration-200',
          s.track,
          checked ? 'bg-maki-gold' : 'bg-gray-300'
        )}
      >
        <motion.div
          animate={{ x: checked ? (size === 'lg' ? 30 : 22) : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-1 rounded-full bg-white shadow-sm',
            s.thumb
          )}
        />
      </div>
      {label && (
        <span className="text-touch-base font-medium text-maki-dark">{label}</span>
      )}
    </button>
  );
}
