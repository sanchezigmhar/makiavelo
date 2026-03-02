'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  color?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  size = 'md',
  fullWidth = false,
  className,
}: TabsProps) {
  const sizeStyles = {
    sm: 'min-h-[36px] px-3 py-1.5 text-sm',
    md: 'min-h-[44px] px-4 py-2 text-touch-base',
    lg: 'min-h-[52px] px-6 py-3 text-touch-lg',
  };

  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'flex gap-2 overflow-x-auto scrollbar-hide p-1',
          fullWidth && 'justify-stretch',
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(tab.id)}
              className={cn(
                'rounded-xl font-semibold whitespace-nowrap flex items-center gap-2',
                'transition-all duration-150 touch-manipulation select-none',
                sizeStyles[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'bg-maki-dark text-white shadow-card'
                  : 'bg-white text-maki-gray hover:bg-gray-100 active:bg-gray-200'
              )}
              style={isActive && tab.color ? { backgroundColor: tab.color } : undefined}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={cn(
                    'min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold flex items-center justify-center',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div className={cn('flex border-b border-gray-200 overflow-x-auto scrollbar-hide', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative font-semibold whitespace-nowrap flex items-center gap-2',
                'transition-colors duration-150 touch-manipulation',
                sizeStyles[size],
                fullWidth && 'flex-1 justify-center',
                isActive
                  ? 'text-maki-gold'
                  : 'text-maki-gray hover:text-maki-dark'
              )}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-maki-gold rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Filled variant
  return (
    <div className={cn('flex bg-gray-100 rounded-xl p-1 overflow-x-auto scrollbar-hide', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative rounded-lg font-semibold whitespace-nowrap flex items-center gap-2',
              'transition-all duration-150 touch-manipulation',
              sizeStyles[size],
              fullWidth && 'flex-1 justify-center',
              isActive
                ? 'bg-white text-maki-dark shadow-sm'
                : 'text-maki-gray hover:text-maki-dark'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
