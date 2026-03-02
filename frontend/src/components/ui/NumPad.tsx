'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BackspaceIcon } from '@heroicons/react/24/outline';
import { cn, formatCurrency } from '@/lib/utils';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: number) => void;
  label?: string;
  maxValue?: number;
  showDecimal?: boolean;
  showCurrency?: boolean;
  className?: string;
}

export default function NumPad({
  value,
  onChange,
  onSubmit,
  label,
  maxValue = 99999.99,
  showDecimal = true,
  showCurrency = true,
  className,
}: NumPadProps) {
  const handlePress = useCallback(
    (key: string) => {
      let newValue = value;

      if (key === 'C') {
        newValue = '';
      } else if (key === 'backspace') {
        newValue = value.slice(0, -1);
      } else if (key === '.') {
        if (!value.includes('.') && showDecimal) {
          newValue = value === '' ? '0.' : value + '.';
        } else {
          return;
        }
      } else {
        // Number key
        const testValue = value + key;
        const numValue = parseFloat(testValue);

        // Check decimal places
        if (value.includes('.')) {
          const decimals = testValue.split('.')[1];
          if (decimals && decimals.length > 2) return;
        }

        // Check max value
        if (numValue > maxValue) return;

        // Prevent leading zeros (except "0.")
        if (value === '0' && key !== '.') {
          newValue = key;
        } else {
          newValue = testValue;
        }
      }

      onChange(newValue);
    },
    [value, onChange, maxValue, showDecimal]
  );

  const numericValue = parseFloat(value || '0');

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    [showDecimal ? '.' : 'C', '0', 'backspace'],
  ];

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Display */}
      <div className="w-full bg-maki-light rounded-2xl p-4 text-center">
        {label && (
          <p className="text-sm text-maki-gray mb-1">{label}</p>
        )}
        <p className="text-4xl font-bold text-maki-dark tabular-nums">
          {showCurrency ? formatCurrency(numericValue) : (value || '0')}
        </p>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[320px]">
        {buttons.flat().map((key) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.08 }}
            onClick={() => handlePress(key)}
            className={cn(
              'pad-btn',
              key === 'backspace'
                ? 'bg-red-50 text-maki-red hover:bg-red-100'
                : key === '.' || key === 'C'
                ? 'bg-gray-100 text-maki-dark hover:bg-gray-200'
                : 'bg-maki-cream text-maki-dark hover:bg-maki-gold/20'
            )}
          >
            {key === 'backspace' ? (
              <BackspaceIcon className="w-7 h-7" />
            ) : (
              key
            )}
          </motion.button>
        ))}
      </div>

      {/* Clear button if showing decimal (no C in grid) */}
      {showDecimal && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange('')}
          className="text-maki-gray text-touch-base font-medium py-2 px-6 rounded-xl
                     hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
        >
          Limpiar
        </motion.button>
      )}

      {/* Submit button */}
      {onSubmit && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSubmit(numericValue)}
          disabled={numericValue <= 0}
          className={cn(
            'w-full max-w-[320px] min-h-[56px] rounded-xl text-touch-lg font-bold',
            'transition-all duration-150 touch-manipulation',
            numericValue > 0
              ? 'bg-maki-gold text-white shadow-card active:shadow-card-active'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          Confirmar {showCurrency && formatCurrency(numericValue)}
        </motion.button>
      )}
    </div>
  );
}

// Quick amount buttons
export function QuickAmounts({
  amounts,
  onSelect,
  className,
}: {
  amounts: number[];
  onSelect: (amount: number) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {amounts.map((amount) => (
        <motion.button
          key={amount}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(amount)}
          className="px-4 py-2 rounded-xl bg-maki-light text-maki-dark font-semibold
                     hover:bg-maki-cream active:bg-maki-gold/20 transition-colors
                     min-h-[44px] touch-manipulation"
        >
          {formatCurrency(amount)}
        </motion.button>
      ))}
    </div>
  );
}
