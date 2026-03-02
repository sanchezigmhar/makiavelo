'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

const paddingStyles: Record<string, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  children,
  className,
  onClick,
  padding = 'md',
  hoverable = false,
  selected = false,
  disabled = false,
}: CardProps) {
  const isInteractive = !!onClick && !disabled;

  const baseClasses = cn(
    'bg-white rounded-2xl shadow-card transition-all duration-150 ease-out',
    paddingStyles[padding],
    isInteractive && 'cursor-pointer active:scale-[0.98] active:shadow-card-active touch-manipulation',
    hoverable && 'hover:shadow-card-hover',
    selected && 'ring-2 ring-maki-gold ring-offset-2',
    disabled && 'opacity-50 cursor-not-allowed',
    className
  );

  if (isInteractive) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        className={baseClasses}
        onClick={onClick}
        role="button"
        tabIndex={0}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClasses}>{children}</div>;
}

// Sub-components
export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-touch-lg font-semibold text-maki-dark', className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('', className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between mt-3 pt-3 border-t border-gray-100', className)}>
      {children}
    </div>
  );
}
