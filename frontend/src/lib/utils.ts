import { format, formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';

// ---- Class merging ----
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ---- Currency formatting ----
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PA', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(2)}`;
}

// ---- Date/Time formatting ----
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "d 'de' MMMM, yyyy", { locale: es });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy');
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy h:mm a");
}

export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

export function minutesElapsed(date: string | Date): number {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return differenceInMinutes(new Date(), d);
}

export function formatElapsedTime(date: string | Date): string {
  const mins = minutesElapsed(date);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ---- Number formatting ----
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-PA').format(num);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ---- String utilities ----
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getInitials(name: string | undefined | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ---- Table status helpers ----
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';

export const tableStatusConfig: Record<TableStatus, { label: string; color: string; bgClass: string }> = {
  AVAILABLE: { label: 'Disponible', color: '#10B981', bgClass: 'status-available' },
  OCCUPIED: { label: 'Ocupada', color: '#F59E0B', bgClass: 'status-occupied' },
  RESERVED: { label: 'Reservada', color: '#3B82F6', bgClass: 'status-reserved' },
  CLEANING: { label: 'Limpieza', color: '#6B7280', bgClass: 'status-cleaning' },
  BLOCKED: { label: 'Bloqueada', color: '#EF4444', bgClass: 'status-blocked' },
};

// ---- Order status helpers ----
export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CLOSED' | 'CANCELLED';

export const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  OPEN: { label: 'Abierta', color: '#3B82F6' },
  IN_PROGRESS: { label: 'En preparacion', color: '#F59E0B' },
  READY: { label: 'Lista', color: '#10B981' },
  DELIVERED: { label: 'Entregada', color: '#6B7280' },
  CLOSED: { label: 'Cerrada', color: '#1B3A2D' },
  CANCELLED: { label: 'Cancelada', color: '#EF4444' },
};

// ---- KDS item status helpers ----
export type KdsItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';

export const kdsStatusConfig: Record<KdsItemStatus, { label: string; bgClass: string; borderColor: string }> = {
  PENDING: { label: 'Nuevo', bgClass: 'kds-new', borderColor: 'border-gray-200' },
  PREPARING: { label: 'Preparando', bgClass: 'kds-preparing', borderColor: 'border-amber-300' },
  READY: { label: 'Listo', bgClass: 'kds-ready', borderColor: 'border-emerald-300' },
  DELIVERED: { label: 'Entregado', bgClass: 'kds-ready', borderColor: 'border-gray-300' },
};

// ---- Payment method helpers ----
export type PaymentMethod = 'CASH' | 'CARD' | 'YAPPY' | 'TRANSFER' | 'OTHER';

export const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: string }> = {
  CASH: { label: 'Efectivo', icon: 'BanknotesIcon' },
  CARD: { label: 'Tarjeta', icon: 'CreditCardIcon' },
  YAPPY: { label: 'Yappy', icon: 'DevicePhoneMobileIcon' },
  TRANSFER: { label: 'Transferencia', icon: 'ArrowsRightLeftIcon' },
  OTHER: { label: 'Otro', icon: 'EllipsisHorizontalIcon' },
};

// ---- ID generators ----
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
