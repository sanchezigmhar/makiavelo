'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'gold' | 'dark' | 'white';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

const colorStyles: Record<string, string> = {
  gold: 'border-maki-gold border-t-transparent',
  dark: 'border-maki-dark border-t-transparent',
  white: 'border-white border-t-transparent',
};

export default function LoadingSpinner({
  size = 'md',
  color = 'gold',
  fullScreen = false,
  message,
  className,
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-full animate-spin',
          sizeStyles[size],
          colorStyles[color]
        )}
      />
      {message && (
        <p className={cn(
          'text-touch-base font-medium',
          color === 'white' ? 'text-white/80' : 'text-maki-gray'
        )}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-maki-light/90 backdrop-blur-sm z-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Full page loading state
export function PageLoader({ message = 'Cargando...' }: { message?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

// Skeleton loader
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 rounded-xl',
        className
      )}
      {...props}
    />
  );
}
