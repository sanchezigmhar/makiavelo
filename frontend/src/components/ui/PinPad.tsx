'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BackspaceIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface PinPadProps {
  onComplete: (pin: string) => void;
  pinLength?: number;
  title?: string;
  subtitle?: string;
  error?: string;
  loading?: boolean;
  className?: string;
}

export default function PinPad({
  onComplete,
  pinLength = 4,
  title = 'Ingresa tu PIN',
  subtitle,
  error,
  loading = false,
  className,
}: PinPadProps) {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);

  // Auto-submit when pin is complete
  useEffect(() => {
    if (pin.length === pinLength) {
      onComplete(pin);
    }
  }, [pin, pinLength, onComplete]);

  // Handle error shake
  useEffect(() => {
    if (error) {
      setShake(true);
      setPin('');
      const timer = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handlePress = useCallback(
    (key: string) => {
      if (loading) return;

      if (key === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
      } else if (key === 'clear') {
        setPin('');
      } else if (pin.length < pinLength) {
        setPin((prev) => prev + key);
      }
    },
    [pin.length, pinLength, loading]
  );

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['clear', '0', 'backspace'],
  ];

  return (
    <div className={cn('flex flex-col items-center gap-6', className)}>
      {/* Header */}
      <div className="text-center">
        <LockClosedIcon className="w-8 h-8 text-maki-gold mx-auto mb-3" />
        <h2 className="text-touch-xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="text-maki-cream/70 mt-1 text-touch-base">{subtitle}</p>
        )}
      </div>

      {/* PIN Dots */}
      <div
        className={cn(
          'flex items-center gap-4 py-4',
          shake && 'animate-shake'
        )}
      >
        {Array.from({ length: pinLength }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              scale: i === pin.length - 1 && pin.length > 0 ? [1, 1.3, 1] : 1,
            }}
            transition={{ duration: 0.2 }}
            className={cn(
              'w-5 h-5 rounded-full transition-all duration-200',
              i < pin.length
                ? 'bg-maki-gold scale-110'
                : 'bg-white/20 border-2 border-white/30'
            )}
          />
        ))}
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-red-400 text-touch-base font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Loading */}
      {loading && (
        <div className="w-6 h-6 border-2 border-maki-gold border-t-transparent rounded-full animate-spin" />
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4">
        {buttons.flat().map((key) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.08 }}
            onClick={() => handlePress(key)}
            disabled={loading}
            className={cn(
              'w-[84px] h-[84px] rounded-full text-2xl font-bold',
              'flex items-center justify-center touch-manipulation',
              'transition-all duration-100',
              'disabled:opacity-40',
              key === 'backspace'
                ? 'text-white/60 hover:bg-white/10 active:bg-white/20'
                : key === 'clear'
                ? 'text-white/40 text-base font-medium hover:bg-white/10 active:bg-white/20'
                : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30 backdrop-blur-sm'
            )}
          >
            {key === 'backspace' ? (
              <BackspaceIcon className="w-7 h-7" />
            ) : key === 'clear' ? (
              'Borrar'
            ) : (
              key
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
