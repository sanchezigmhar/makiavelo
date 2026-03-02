'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  BellIcon,
  WifiIcon,
  SignalSlashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { CountBadge } from '@/components/ui/Badge';
import { cn, getInitials } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const { user, branch, isOnline } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [alertCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        {title && (
          <div>
            <h1 className="text-touch-xl font-bold text-maki-dark">{title}</h1>
            {subtitle && (
              <p className="text-sm text-maki-gray">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Center: Actions */}
      {actions && <div className="flex items-center gap-3">{actions}</div>}

      {/* Right: Info bar */}
      <div className="flex items-center gap-4">
        {/* Branch */}
        {branch && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-maki-light rounded-lg">
            <span className="text-sm font-medium text-maki-dark">
              {branch.name}
            </span>
          </div>
        )}

        {/* Clock */}
        <div className="text-sm font-medium text-maki-gray tabular-nums">
          {format(currentTime, "h:mm a", { locale: es })}
        </div>

        {/* Connection status */}
        <div
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
            isOnline
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-600 animate-pulse-soft'
          )}
        >
          {isOnline ? (
            <>
              <WifiIcon className="w-4 h-4" />
              <span className="hidden xl:inline">Online</span>
            </>
          ) : (
            <>
              <SignalSlashIcon className="w-4 h-4" />
              <span className="hidden xl:inline">Offline</span>
            </>
          )}
        </div>

        {/* Alerts */}
        <button className="relative min-w-[44px] min-h-[44px] flex items-center justify-center
                          rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation">
          <BellIcon className="w-6 h-6 text-maki-gray" />
          <CountBadge count={alertCount} className="absolute -top-0.5 -right-0.5" />
        </button>

        {/* User avatar */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="w-9 h-9 rounded-full bg-maki-gold flex items-center justify-center">
              <span className="text-white text-sm font-bold">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold text-maki-dark leading-tight">
                {user.name}
              </p>
              <p className="text-xs text-maki-gray leading-tight">
                {user.role?.name || 'Staff'}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
