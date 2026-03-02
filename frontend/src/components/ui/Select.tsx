'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  disabled = false,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-maki-gray mb-1.5">
          {label}
        </label>
      )}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border border-gray-200',
          'text-left text-touch-base flex items-center justify-between gap-2',
          'transition-all duration-150 touch-manipulation',
          'focus:outline-none focus:ring-2 focus:ring-maki-gold/30 focus:border-maki-gold',
          isOpen && 'ring-2 ring-maki-gold/30 border-maki-gold',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
        )}
      >
        <span className={cn(!selectedOption && 'text-gray-400')}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.icon}
              {selectedOption.label}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            'w-5 h-5 text-maki-gray transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-elevated border border-gray-100
                       overflow-hidden max-h-64 overflow-y-auto scrollbar-thin"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full min-h-[48px] px-4 py-3 text-left flex items-center justify-between',
                  'text-touch-base transition-colors touch-manipulation',
                  'hover:bg-maki-light active:bg-maki-cream',
                  option.value === value && 'bg-maki-light'
                )}
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <p className="font-medium text-maki-dark">{option.label}</p>
                    {option.description && (
                      <p className="text-sm text-maki-gray">{option.description}</p>
                    )}
                  </div>
                </div>
                {option.value === value && (
                  <CheckIcon className="w-5 h-5 text-maki-gold" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
