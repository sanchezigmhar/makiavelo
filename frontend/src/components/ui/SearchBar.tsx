'use client';

import React from 'react';
import { MagnifyingGlassIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  autoFocus = false,
}: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-maki-gray" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-h-[48px] pl-12 pr-12 rounded-xl bg-white border border-gray-200
                   text-touch-base text-maki-dark placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-maki-gold/30 focus:border-maki-gold
                   transition-all duration-150"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px]
                     flex items-center justify-center rounded-lg
                     hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
        >
          <XCircleIcon className="w-5 h-5 text-maki-gray" />
        </button>
      )}
    </div>
  );
}
