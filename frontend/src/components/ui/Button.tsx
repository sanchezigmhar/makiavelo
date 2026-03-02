'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<string, string> = {
  primary: 'bg-maki-gold text-white shadow-card hover:shadow-card-hover active:bg-maki-gold/90',
  secondary: 'bg-maki-dark text-white shadow-card hover:shadow-card-hover active:bg-maki-dark/90',
  outline: 'border-2 border-maki-dark text-maki-dark bg-transparent hover:bg-maki-dark hover:text-white',
  ghost: 'text-maki-dark hover:bg-maki-dark/5 active:bg-maki-dark/10',
  danger: 'bg-maki-red text-white shadow-card hover:shadow-card-hover active:bg-maki-red/90',
  success: 'bg-emerald-600 text-white shadow-card hover:shadow-card-hover active:bg-emerald-700',
};

const sizeStyles: Record<string, string> = {
  sm: 'min-h-[40px] px-4 py-2 text-sm rounded-lg gap-1.5',
  md: 'min-h-[48px] px-6 py-3 text-touch-base rounded-xl gap-2',
  lg: 'min-h-[56px] px-8 py-4 text-touch-lg rounded-xl gap-2.5',
  xl: 'min-h-[64px] px-10 py-5 text-touch-xl rounded-2xl gap-3',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  className,
  children,
  disabled,
  onClick,
  type = 'button',
}: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'font-semibold flex items-center justify-center transition-all duration-150 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        'select-none touch-manipulation',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </motion.button>
  );
}
