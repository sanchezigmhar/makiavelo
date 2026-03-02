'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  PlusIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
  LockClosedIcon,
  LockOpenIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  Squares2X2Icon,
  StarIcon,
  LinkIcon,
  ScissorsIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Tabs from '@/components/ui/Tabs';
import { BottomSheet } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import RequirePermission from '@/components/common/RequirePermission';
import { useTablesStore } from '@/store/tables.store';
import { useCartStore } from '@/store/cart.store';
import { useOrdersStore } from '@/store/orders.store';
import { useNotificationsStore, ReadyItemNotification } from '@/store/notifications.store';
import { useSocketEvent } from '@/hooks/useSocket';
import { cn, formatCurrency, tableStatusConfig, formatElapsedTime } from '@/lib/utils';
import type { Table, TableStatus, Zone } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TableShape = 'round' | 'square' | 'rect-horizontal' | 'rect-vertical' | 'bar-segment';

interface CanvasTable {
  id: string;
  number: number;
  name: string;
  zoneId: string;
  zoneName: string;
  capacity: number;
  status: TableStatus;
  shape: TableShape;
  x: number;
  y: number;
  occupiedAt?: string;
  orderTotal?: number;
  serverName?: string;
  currentOrderId?: string;
  // Fusion / merge tracking
  mergedFrom?: MergedTableInfo[];
  isMerged?: boolean;
}

interface MergedTableInfo {
  id: string;
  number: number;
  name: string;
  capacity: number;
  shape: TableShape;
  originalX: number;
  originalY: number;
}

interface Reservation {
  id: string;
  guestName: string;
  partySize: number;
  time: string;
  phone: string;
  notes: string;
  zonePreference?: string;
  assignedTableId?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 20;
const CANVAS_W = 1400;
const CANVAS_H = 1000;

const STATUS_COLORS: Record<TableStatus, string> = {
  AVAILABLE: '#10B981',
  OCCUPIED: '#D4842A',
  RESERVED: '#3B82F6',
  CLEANING: '#9CA3AF',
  BLOCKED: '#EF4444',
};

const STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: 'Disponible',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
  CLEANING: 'Limpieza',
  BLOCKED: 'Bloqueada',
};

const SHAPE_LABELS: Record<TableShape, string> = {
  round: 'Redonda',
  square: 'Cuadrada',
  'rect-horizontal': 'Rectangular H',
  'rect-vertical': 'Rectangular V',
  'bar-segment': 'Barra',
};

const ZONE_COLORS: Record<string, string> = {
  salon: 'rgba(45,90,69,0.06)',
  terraza: 'rgba(212,132,42,0.06)',
  bar: 'rgba(59,130,246,0.06)',
  vip: 'rgba(168,85,247,0.06)',
};

const ZONE_BORDER_COLORS: Record<string, string> = {
  salon: 'rgba(45,90,69,0.15)',
  terraza: 'rgba(212,132,42,0.15)',
  bar: 'rgba(59,130,246,0.15)',
  vip: 'rgba(168,85,247,0.15)',
};

const ZONE_LABEL_COLORS: Record<string, string> = {
  salon: '#2D5A45',
  terraza: '#D4842A',
  bar: '#3B82F6',
  vip: '#8B5CF6',
};

// Map zone name (lowercase) to known zone key for color resolution
const ZONE_NAME_MAP: Record<string, string> = {
  'salon principal': 'salon',
  'salon': 'salon',
  'salón principal': 'salon',
  'salón': 'salon',
  'terraza': 'terraza',
  'bar': 'bar',
  'vip': 'vip',
};

function resolveZoneKey(zoneId: string, zoneName?: string): string {
  // Direct match
  if (ZONE_COLORS[zoneId]) return zoneId;
  // Match by name
  if (zoneName) {
    const key = ZONE_NAME_MAP[zoneName.toLowerCase()];
    if (key) return key;
  }
  return zoneId;
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

function generateDemoTables(): CanvasTable[] {
  const now = Date.now();
  return [
    // Salon Principal - mostly 2-person round tables (user merges them as needed)
    { id: 't1', number: 1, name: 'Mesa 1', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 80, y: 100 },
    { id: 't2', number: 2, name: 'Mesa 2', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 200, y: 100 },
    { id: 't3', number: 3, name: 'Mesa 3', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'OCCUPIED', shape: 'round', x: 320, y: 100, occupiedAt: new Date(now - 45 * 60000).toISOString(), orderTotal: 67.50, serverName: 'Carlos M.', currentOrderId: 'o3' },
    { id: 't4', number: 4, name: 'Mesa 4', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 440, y: 100 },
    { id: 't5', number: 5, name: 'Mesa 5', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 560, y: 100 },
    { id: 't6', number: 6, name: 'Mesa 6', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 80, y: 240 },
    { id: 't7', number: 7, name: 'Mesa 7', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'OCCUPIED', shape: 'round', x: 200, y: 240, occupiedAt: new Date(now - 22 * 60000).toISOString(), orderTotal: 42.00, serverName: 'Maria L.', currentOrderId: 'o7' },
    { id: 't8', number: 8, name: 'Mesa 8', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 320, y: 240 },
    { id: 't9', number: 9, name: 'Mesa 9', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 440, y: 240 },
    { id: 't10', number: 10, name: 'Mesa 10', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'CLEANING', shape: 'round', x: 560, y: 240 },
    { id: 't11', number: 11, name: 'Mesa 11', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 80, y: 380 },
    { id: 't12', number: 12, name: 'Mesa 12', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 200, y: 380 },
    { id: 't13', number: 13, name: 'Mesa 13', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'RESERVED', shape: 'round', x: 320, y: 380 },
    { id: 't14', number: 14, name: 'Mesa 14', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 440, y: 380 },
    { id: 't15', number: 15, name: 'Mesa 15', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 560, y: 380 },
    { id: 't16', number: 16, name: 'Mesa 16', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 80, y: 520 },
    { id: 't17', number: 17, name: 'Mesa 17', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 200, y: 520 },
    { id: 't18', number: 18, name: 'Mesa 18', zoneId: 'salon', zoneName: 'Salon', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 320, y: 520 },

    // Terraza - 2-person tables spread out (merge for groups)
    { id: 't19', number: 19, name: 'Mesa 19', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 780, y: 100 },
    { id: 't20', number: 20, name: 'Mesa 20', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'OCCUPIED', shape: 'round', x: 900, y: 100, occupiedAt: new Date(now - 35 * 60000).toISOString(), orderTotal: 98.75, serverName: 'Ana S.', currentOrderId: 'o20' },
    { id: 't21', number: 21, name: 'Mesa 21', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1020, y: 100 },
    { id: 't22', number: 22, name: 'Mesa 22', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1140, y: 100 },
    { id: 't23', number: 23, name: 'Mesa 23', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 780, y: 240 },
    { id: 't24', number: 24, name: 'Mesa 24', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'RESERVED', shape: 'round', x: 900, y: 240 },
    { id: 't25', number: 25, name: 'Mesa 25', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1020, y: 240 },
    { id: 't26', number: 26, name: 'Mesa 26', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1140, y: 240 },
    { id: 't27', number: 27, name: 'Mesa 27', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 780, y: 380 },
    { id: 't28', number: 28, name: 'Mesa 28', zoneId: 'terraza', zoneName: 'Terraza', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 900, y: 380 },

    // Bar - bar segments (2 person each)
    { id: 't29', number: 29, name: 'Barra 1', zoneId: 'bar', zoneName: 'Bar', capacity: 2, status: 'OCCUPIED', shape: 'bar-segment', x: 80, y: 700, occupiedAt: new Date(now - 18 * 60000).toISOString(), orderTotal: 32.00, serverName: 'Luis B.', currentOrderId: 'o29' },
    { id: 't30', number: 30, name: 'Barra 2', zoneId: 'bar', zoneName: 'Bar', capacity: 2, status: 'AVAILABLE', shape: 'bar-segment', x: 260, y: 700 },
    { id: 't31', number: 31, name: 'Barra 3', zoneId: 'bar', zoneName: 'Bar', capacity: 2, status: 'OCCUPIED', shape: 'bar-segment', x: 440, y: 700, occupiedAt: new Date(now - 8 * 60000).toISOString(), orderTotal: 28.50, serverName: 'Luis B.', currentOrderId: 'o31' },
    { id: 't32', number: 32, name: 'Barra 4', zoneId: 'bar', zoneName: 'Bar', capacity: 2, status: 'AVAILABLE', shape: 'bar-segment', x: 620, y: 700 },
    { id: 't33', number: 33, name: 'Barra 5', zoneId: 'bar', zoneName: 'Bar', capacity: 2, status: 'BLOCKED', shape: 'bar-segment', x: 800, y: 700 },

    // VIP - 2-person tables (merge for VIP groups)
    { id: 't34', number: 34, name: 'VIP 1', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 780, y: 540 },
    { id: 't35', number: 35, name: 'VIP 2', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 900, y: 540 },
    { id: 't36', number: 36, name: 'VIP 3', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'OCCUPIED', shape: 'round', x: 1020, y: 540, occupiedAt: new Date(now - 90 * 60000).toISOString(), orderTotal: 342.00, serverName: 'Pedro R.', currentOrderId: 'o36' },
    { id: 't37', number: 37, name: 'VIP 4', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1140, y: 540 },
    { id: 't38', number: 38, name: 'VIP 5', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'RESERVED', shape: 'round', x: 880, y: 660 },
    { id: 't39', number: 39, name: 'VIP 6', zoneId: 'vip', zoneName: 'VIP', capacity: 2, status: 'AVAILABLE', shape: 'round', x: 1000, y: 660 },
  ];
}

function generateDemoReservations(): Reservation[] {
  const today = new Date();
  const fmt = (h: number, m: number) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  return [
    { id: 'r1', guestName: 'Familia Rodriguez', partySize: 6, time: fmt(18, 30), phone: '+507 6612-3456', notes: 'Cumpleanos, necesitan pastel', zonePreference: 'salon' },
    { id: 'r2', guestName: 'Sr. Chen Wei', partySize: 2, time: fmt(19, 0), phone: '+507 6701-8899', notes: 'Cliente VIP frecuente', zonePreference: 'vip' },
    { id: 'r3', guestName: 'Ana Martinez', partySize: 4, time: fmt(19, 30), phone: '+507 6555-1234', notes: 'Alergica al mani', zonePreference: 'terraza' },
    { id: 'r4', guestName: 'Grupo Empresarial PwC', partySize: 10, time: fmt(20, 0), phone: '+507 6300-7788', notes: 'Cena de negocios, cuenta corporativa' },
    { id: 'r5', guestName: 'Pareja Gomez', partySize: 2, time: fmt(20, 30), phone: '+507 6441-2233', notes: 'Aniversario, mesa romantica' },
    { id: 'r6', guestName: 'Dr. Fernandez +3', partySize: 4, time: fmt(21, 0), phone: '+507 6899-4455', notes: '' },
  ];
}

// ---------------------------------------------------------------------------
// Helper: snap to grid
// ---------------------------------------------------------------------------

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// ---------------------------------------------------------------------------
// Helper: Find nearest available tables by proximity (for tap-based merge)
// ---------------------------------------------------------------------------

function getTableCenter(table: CanvasTable): { cx: number; cy: number } {
  const dim = getTableDimensions(table.shape, table.capacity);
  return { cx: table.x + dim.w / 2, cy: table.y + dim.h / 2 };
}

function distanceBetweenTables(a: CanvasTable, b: CanvasTable): number {
  const ca = getTableCenter(a);
  const cb = getTableCenter(b);
  return Math.sqrt(Math.pow(ca.cx - cb.cx, 2) + Math.pow(ca.cy - cb.cy, 2));
}

/**
 * Find the nearest AVAILABLE tables to the source table, sorted by distance.
 * Returns enough tables to fill the requested capacity.
 */
function findNearestAvailableTables(
  sourceTable: CanvasTable,
  allTables: CanvasTable[],
  neededCapacity: number
): CanvasTable[] {
  // Get all available tables (not occupied, not the source itself)
  const candidates = allTables
    .filter((t) => t.id !== sourceTable.id && t.status === 'AVAILABLE')
    .map((t) => ({ table: t, dist: distanceBetweenTables(sourceTable, t) }))
    .sort((a, b) => a.dist - b.dist);

  const result: CanvasTable[] = [];
  let accumulated = sourceTable.capacity;

  for (const c of candidates) {
    if (accumulated >= neededCapacity) break;
    result.push(c.table);
    accumulated += c.table.capacity;
  }

  return result;
}

/** Pick the best shape for a merged table based on total capacity */
function getMergedShape(totalCapacity: number): TableShape {
  if (totalCapacity <= 2) return 'round';
  if (totalCapacity <= 4) return 'square';
  if (totalCapacity <= 6) return 'rect-horizontal';
  return 'rect-horizontal'; // large tables are always rect
}

// ---------------------------------------------------------------------------
// Helper: get table dimensions based on shape
// ---------------------------------------------------------------------------

function getTableDimensions(shape: TableShape, capacity: number): { w: number; h: number } {
  switch (shape) {
    case 'round':
      return capacity <= 2 ? { w: 80, h: 80 } : capacity <= 4 ? { w: 100, h: 100 } : { w: 120, h: 120 };
    case 'square':
      return capacity <= 4 ? { w: 100, h: 100 } : { w: 120, h: 120 };
    case 'rect-horizontal':
      return capacity <= 6 ? { w: 160, h: 90 } : capacity <= 8 ? { w: 200, h: 90 } : { w: 240, h: 100 };
    case 'rect-vertical':
      return capacity <= 6 ? { w: 90, h: 160 } : { w: 100, h: 200 };
    case 'bar-segment':
      return { w: 140, h: 60 };
    default:
      return { w: 100, h: 100 };
  }
}

// ---------------------------------------------------------------------------
// SVG Table Shape Renderer
// ---------------------------------------------------------------------------

function TableShapeSVG({
  table,
  isEditMode,
  isHighlighted,
  isBestMatch,
  isDimmed,
  isMergeTarget,
  isMergedTable,
  colorOverride,
}: {
  table: CanvasTable;
  isEditMode: boolean;
  isHighlighted: boolean;
  isBestMatch: boolean;
  isDimmed: boolean;
  isMergeTarget?: boolean;
  isMergedTable?: boolean;
  colorOverride?: string;
}) {
  const { w, h } = getTableDimensions(table.shape, table.capacity);
  const color = colorOverride || STATUS_COLORS[table.status];
  const isOccupied = table.status === 'OCCUPIED';

  const chairSize = 10;
  const chairGap = 6;

  function renderChairs() {
    const chairs: React.ReactNode[] = [];
    const cap = table.capacity;

    if (table.shape === 'round') {
      const radius = w / 2 + chairSize + 2;
      const cx = w / 2;
      const cy = h / 2;
      for (let i = 0; i < cap; i++) {
        const angle = (2 * Math.PI * i) / cap - Math.PI / 2;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        chairs.push(
          <circle key={`ch-${i}`} cx={px} cy={py} r={chairSize / 2} fill={color} opacity={0.5} />
        );
      }
    } else if (table.shape === 'square') {
      const sides = Math.ceil(cap / 4);
      const positions: [number, number][] = [];
      // top
      for (let i = 0; i < sides; i++) {
        positions.push([w / 2 - ((sides - 1) * (chairSize + chairGap)) / 2 + i * (chairSize + chairGap), -(chairSize / 2 + 4)]);
      }
      // bottom
      for (let i = 0; i < sides; i++) {
        positions.push([w / 2 - ((sides - 1) * (chairSize + chairGap)) / 2 + i * (chairSize + chairGap), h + chairSize / 2 + 4]);
      }
      // left
      for (let i = 0; i < sides && positions.length < cap; i++) {
        positions.push([-(chairSize / 2 + 4), h / 2 - ((sides - 1) * (chairSize + chairGap)) / 2 + i * (chairSize + chairGap)]);
      }
      // right
      for (let i = 0; i < sides && positions.length < cap; i++) {
        positions.push([w + chairSize / 2 + 4, h / 2 - ((sides - 1) * (chairSize + chairGap)) / 2 + i * (chairSize + chairGap)]);
      }
      positions.slice(0, cap).forEach(([px, py], idx) => {
        chairs.push(
          <rect key={`ch-${idx}`} x={px - chairSize / 2} y={py - chairSize / 2} width={chairSize} height={chairSize} rx={3} fill={color} opacity={0.5} />
        );
      });
    } else if (table.shape === 'rect-horizontal' || table.shape === 'rect-vertical') {
      const isH = table.shape === 'rect-horizontal';
      const longSide = isH ? w : h;
      const perSide = Math.ceil(cap / 2);
      const spacing = longSide / (perSide + 1);

      for (let i = 0; i < perSide; i++) {
        if (isH) {
          // top row
          chairs.push(
            <rect key={`ch-t-${i}`} x={spacing * (i + 1) - chairSize / 2} y={-(chairSize / 2 + 4)} width={chairSize} height={chairSize} rx={3} fill={color} opacity={0.5} />
          );
          // bottom row
          if (chairs.length < cap + perSide) {
            chairs.push(
              <rect key={`ch-b-${i}`} x={spacing * (i + 1) - chairSize / 2} y={h + 4 - chairSize / 2 + chairSize / 2} width={chairSize} height={chairSize} rx={3} fill={color} opacity={0.5} />
            );
          }
        } else {
          // left
          chairs.push(
            <rect key={`ch-l-${i}`} x={-(chairSize / 2 + 4)} y={spacing * (i + 1) - chairSize / 2} width={chairSize} height={chairSize} rx={3} fill={color} opacity={0.5} />
          );
          // right
          if (chairs.length < cap + perSide) {
            chairs.push(
              <rect key={`ch-r-${i}`} x={w + 4 - chairSize / 2 + chairSize / 2} y={spacing * (i + 1) - chairSize / 2} width={chairSize} height={chairSize} rx={3} fill={color} opacity={0.5} />
            );
          }
        }
      }
    } else if (table.shape === 'bar-segment') {
      const count = table.capacity;
      const spacing = w / (count + 1);
      for (let i = 0; i < count; i++) {
        chairs.push(
          <circle key={`ch-${i}`} cx={spacing * (i + 1)} cy={-(chairSize / 2 + 4)} r={chairSize / 2} fill={color} opacity={0.5} />
        );
      }
    }

    return chairs;
  }

  function renderTableBody() {
    const rx = table.shape === 'round' ? w / 2 : 8;
    const fillOpacity = isDimmed ? 0.25 : 1;

    if (table.shape === 'round') {
      return (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={color}
          fillOpacity={fillOpacity * 0.15}
          stroke={color}
          strokeWidth={2.5}
          strokeOpacity={isDimmed ? 0.3 : 1}
        />
      );
    }

    return (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={rx}
        fill={color}
        fillOpacity={fillOpacity * 0.15}
        stroke={color}
        strokeWidth={2.5}
        strokeOpacity={isDimmed ? 0.3 : 1}
      />
    );
  }

  const padding = 20;
  const svgW = w + padding * 2;
  const svgH = h + padding * 2;

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`${-padding} ${-padding} ${svgW} ${svgH}`}
      className="pointer-events-none select-none"
    >
      {/* Glow for occupied */}
      {isOccupied && !isDimmed && (
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 8} ry={h / 2 + 8} fill={color} opacity={0.1}>
          <animate attributeName="opacity" values="0.05;0.15;0.05" dur="2.5s" repeatCount="indefinite" />
        </ellipse>
      )}

      {/* Best match gold border */}
      {isBestMatch && (
        <>
          {table.shape === 'round' ? (
            <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 5} ry={h / 2 + 5} fill="none" stroke="#D4842A" strokeWidth={3} opacity={0.8}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <rect x={-5} y={-5} width={w + 10} height={h + 10} rx={12} fill="none" stroke="#D4842A" strokeWidth={3} opacity={0.8}>
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite" />
            </rect>
          )}
        </>
      )}

      {/* Highlight ring */}
      {isHighlighted && !isBestMatch && (
        <>
          {table.shape === 'round' ? (
            <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 4} ry={h / 2 + 4} fill="none" stroke="#10B981" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
          ) : (
            <rect x={-4} y={-4} width={w + 8} height={h + 8} rx={11} fill="none" stroke="#10B981" strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
          )}
        </>
      )}

      {/* Chairs */}
      <g opacity={isDimmed ? 0.25 : 0.6}>
        {renderChairs()}
      </g>

      {/* Table body */}
      {renderTableBody()}

      {/* Table number */}
      <text
        x={w / 2}
        y={h / 2 - (isOccupied && table.serverName ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={table.capacity >= 8 ? 18 : 16}
        fontWeight="700"
        fill={isDimmed ? '#CBD5E1' : '#1B3A2D'}
        opacity={isDimmed ? 0.5 : 1}
      >
        {table.number}
      </text>

      {/* Capacity indicator */}
      <text
        x={w / 2}
        y={h / 2 + (isOccupied && table.serverName ? 10 : 13)}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill={isDimmed ? '#CBD5E1' : '#64748B'}
        opacity={isDimmed ? 0.4 : 0.7}
      >
        {table.capacity}p
      </text>

      {/* Server name for occupied */}
      {isOccupied && table.serverName && !isDimmed && (
        <text
          x={w / 2}
          y={h / 2 + 22}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill="#64748B"
          opacity={0.8}
        >
          {table.serverName}
        </text>
      )}

      {/* Edit mode indicator */}
      {isEditMode && !isMergeTarget && (
        <g>
          <circle cx={w - 2} cy={-2} r={8} fill="white" stroke="#D4842A" strokeWidth={1.5} />
          <line x1={w - 5} y1={-2} x2={w + 1} y2={-2} stroke="#D4842A" strokeWidth={1.5} />
          <line x1={w - 2} y1={-5} x2={w - 2} y2={1} stroke="#D4842A" strokeWidth={1.5} />
        </g>
      )}

      {/* Merge target glow - pulsing green ring when dragged table is near */}
      {isMergeTarget && (
        <>
          {table.shape === 'round' ? (
            <ellipse cx={w / 2} cy={h / 2} rx={w / 2 + 10} ry={h / 2 + 10} fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth={3} strokeDasharray="8 4">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="0;24" dur="1s" repeatCount="indefinite" />
            </ellipse>
          ) : (
            <rect x={-10} y={-10} width={w + 20} height={h + 20} rx={14} fill="rgba(16,185,129,0.15)" stroke="#10B981" strokeWidth={3} strokeDasharray="8 4">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.8s" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" values="0;24" dur="1s" repeatCount="indefinite" />
            </rect>
          )}
          {/* FUSIONAR text */}
          <text
            x={w / 2}
            y={h + 16}
            textAnchor="middle"
            fontSize={10}
            fontWeight="800"
            fill="#10B981"
          >
            FUSIONAR
          </text>
        </>
      )}

      {/* Merged table chain icon indicator */}
      {isMergedTable && !isDimmed && (
        <g>
          <circle cx={-4} cy={-4} r={10} fill="#8B5CF6" opacity={0.9} />
          {/* Chain link icon simplified */}
          <path
            d={`M${-8} ${-4} h3 a3,3 0 0 1 0,0 h0 M${-3} ${-4} h3 a3,3 0 0 0 0,0 h0`}
            stroke="white"
            strokeWidth={1.5}
            fill="none"
          />
          <text x={-4} y={-1} textAnchor="middle" fontSize={8} fontWeight="800" fill="white">⚇</text>
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Zone background areas for the canvas
// ---------------------------------------------------------------------------

function ZoneBackgrounds({ tables, selectedZone }: { tables: CanvasTable[]; selectedZone: string | null }) {
  const zones = useMemo(() => {
    const zoneMap = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; name: string; id: string }>();
    tables.forEach((t) => {
      const dim = getTableDimensions(t.shape, t.capacity);
      const existing = zoneMap.get(t.zoneId);
      if (existing) {
        existing.minX = Math.min(existing.minX, t.x - 40);
        existing.maxX = Math.max(existing.maxX, t.x + dim.w + 60);
        existing.minY = Math.min(existing.minY, t.y - 50);
        existing.maxY = Math.max(existing.maxY, t.y + dim.h + 60);
      } else {
        zoneMap.set(t.zoneId, {
          minX: t.x - 40,
          maxX: t.x + dim.w + 60,
          minY: t.y - 50,
          maxY: t.y + dim.h + 60,
          name: t.zoneName,
          id: t.zoneId,
        });
      }
    });
    return Array.from(zoneMap.values());
  }, [tables]);

  return (
    <>
      {zones.map((zone) => {
        const isFiltered = selectedZone && selectedZone !== 'all' && selectedZone !== zone.id;
        const zk = resolveZoneKey(zone.id, zone.name);
        return (
          <div
            key={zone.id}
            className="absolute rounded-2xl transition-opacity duration-300 pointer-events-none"
            style={{
              left: zone.minX,
              top: zone.minY,
              width: zone.maxX - zone.minX,
              height: zone.maxY - zone.minY,
              backgroundColor: ZONE_COLORS[zk] || 'rgba(0,0,0,0.03)',
              border: `1.5px dashed ${ZONE_BORDER_COLORS[zk] || 'rgba(0,0,0,0.1)'}`,
              opacity: isFiltered ? 0.2 : 1,
            }}
          >
            <span
              className="absolute top-2 left-3 text-xs font-bold uppercase tracking-wider opacity-60"
              style={{ color: ZONE_LABEL_COLORS[zk] || '#64748B' }}
            >
              {zone.name}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Table Modal Content
// ---------------------------------------------------------------------------

function AddTableForm({
  onAdd,
  nextNumber,
}: {
  onAdd: (shape: TableShape, capacity: number, zoneId: string) => void;
  nextNumber: number;
}) {
  const [shape, setShape] = useState<TableShape>('round');
  const [capacity, setCapacity] = useState(4);
  const [zoneId, setZoneId] = useState('salon');

  const shapes: TableShape[] = ['round', 'square', 'rect-horizontal', 'rect-vertical', 'bar-segment'];
  const capacities = [2, 4, 6, 8, 10, 12];
  const zones = [
    { id: 'salon', name: 'Salon' },
    { id: 'terraza', name: 'Terraza' },
    { id: 'bar', name: 'Bar' },
    { id: 'vip', name: 'VIP' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-maki-dark mb-2">Mesa #{nextNumber}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Forma</p>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((s) => (
            <button
              key={s}
              onClick={() => setShape(s)}
              className={cn(
                'min-h-[48px] px-3 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation',
                shape === s
                  ? 'bg-maki-dark text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Capacidad</p>
        <div className="grid grid-cols-6 gap-2">
          {capacities.map((c) => (
            <button
              key={c}
              onClick={() => setCapacity(c)}
              className={cn(
                'min-h-[48px] rounded-xl text-sm font-bold transition-all touch-manipulation',
                capacity === c
                  ? 'bg-maki-gold text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Zona</p>
        <div className="grid grid-cols-2 gap-2">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setZoneId(z.id)}
              className={cn(
                'min-h-[48px] px-4 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation',
                zoneId === z.id
                  ? 'bg-maki-green text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {z.name}
            </button>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={<PlusIcon className="w-6 h-6" />}
        onClick={() => onAdd(shape, capacity, zoneId)}
      >
        Agregar Mesa
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit table properties panel
// ---------------------------------------------------------------------------

function EditTablePanel({
  table,
  onUpdate,
  onDelete,
  onClose,
}: {
  table: CanvasTable;
  onUpdate: (updates: Partial<CanvasTable>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const shapes: TableShape[] = ['round', 'square', 'rect-horizontal', 'rect-vertical', 'bar-segment'];
  const capacities = [2, 4, 6, 8, 10, 12];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-maki-dark text-lg">Mesa {table.number}</h3>
        <span className="text-sm text-gray-400">{table.zoneName}</span>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Forma</p>
        <div className="grid grid-cols-3 gap-2">
          {shapes.map((s) => (
            <button
              key={s}
              onClick={() => onUpdate({ shape: s })}
              className={cn(
                'min-h-[44px] px-3 py-2 rounded-xl text-sm font-medium transition-all touch-manipulation',
                table.shape === s
                  ? 'bg-maki-dark text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {SHAPE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-500 mb-2">Capacidad</p>
        <div className="grid grid-cols-6 gap-2">
          {capacities.map((c) => (
            <button
              key={c}
              onClick={() => onUpdate({ capacity: c })}
              className={cn(
                'min-h-[44px] rounded-xl text-sm font-bold transition-all touch-manipulation',
                table.capacity === c
                  ? 'bg-maki-gold text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 flex gap-3">
        <Button variant="danger" size="lg" fullWidth icon={<TrashIcon className="w-5 h-5" />} onClick={onDelete}>
          Eliminar
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onClose}>
          Listo
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function MesasPage() {
  const router = useRouter();
  const { tables: storeTables, zones, selectedZone, isLoading, fetchTables, fetchZones, setSelectedZone, updateTableStatus } = useTablesStore();
  const { setTable } = useCartStore();
  const { activeOrders, fetchOrder, fetchActiveOrders, fetchOrdersByTable, currentOrder } = useOrdersStore();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [canvasTables, setCanvasTables] = useState<CanvasTable[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTable, setSelectedTable] = useState<CanvasTable | null>(null);
  const [showTableSheet, setShowTableSheet] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showEditProps, setShowEditProps] = useState(false);
  const [editingTable, setEditingTable] = useState<CanvasTable | null>(null);

  // Reservations
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [showReservations, setShowReservations] = useState(false);
  const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);

  // Table fusion state
  const [showFusionSheet, setShowFusionSheet] = useState(false);
  const [fusionSourceTable, setFusionSourceTable] = useState<CanvasTable | null>(null);
  const [fusionPersonCount, setFusionPersonCount] = useState<number>(4);
  const [fusionPreview, setFusionPreview] = useState<CanvasTable[]>([]);

  // Persisted merged tables — survive navigation between pages
  const MERGED_STORAGE_KEY = 'makiavelo-merged-tables';
  const mergedInitRef = useRef(false);
  const activeMergedTablesRef = useRef<CanvasTable[]>([]);

  // Load from localStorage once on mount
  if (!mergedInitRef.current && typeof window !== 'undefined') {
    mergedInitRef.current = true;
    try {
      const saved = localStorage.getItem(MERGED_STORAGE_KEY);
      if (saved) activeMergedTablesRef.current = JSON.parse(saved);
    } catch { /* ignore */ }
  }

  // Helper to update ref AND persist to localStorage
  const setMergedTables = useCallback((tables: CanvasTable[]) => {
    activeMergedTablesRef.current = tables;
    try { localStorage.setItem(MERGED_STORAGE_KEY, JSON.stringify(tables)); } catch { /* ignore */ }
  }, []);

  // Table split state
  const [showSplitSheet, setShowSplitSheet] = useState(false);
  const [splitSourceTable, setSplitSourceTable] = useState<CanvasTable | null>(null);
  const [splitCount, setSplitCount] = useState<number>(1);

  // Ver Cuenta sheet state
  const [showBillSheet, setShowBillSheet] = useState(false);
  const [billTable, setBillTable] = useState<CanvasTable | null>(null);
  const [billOrder, setBillOrder] = useState<import('@/types').Order | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  // Delivery sheet state
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [deliveryTable, setDeliveryTable] = useState<CanvasTable | null>(null);

  // Notification store for ready items from KDS
  const { readyItems, addReadyItem, markDelivered: markNotifDelivered, removeNotification } = useNotificationsStore();

  // Audio ref for notification sound
  const notifAudioRef = useRef<HTMLAudioElement | null>(null);

  // Listen to WebSocket events for item status changes (from backend)
  useSocketEvent<{
    orderId: string;
    orderNumber: string;
    itemId: string;
    itemName: string;
    tableNumber?: number;
    tableName?: string;
    status: string;
    quantity?: number;
  }>('order:item-status', (data) => {
    if (data.status === 'READY') {
      addReadyItem({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        itemId: data.itemId,
        itemName: data.itemName,
        tableNumber: data.tableNumber,
        tableName: data.tableName,
        status: 'READY',
        quantity: data.quantity,
      });
      toast(
        `🔔 ${data.tableName || 'Mesa ' + data.tableNumber}: ${data.itemName} está listo!`,
        { duration: 5000, icon: '🍽️', style: { fontWeight: 'bold' } }
      );
      // Play notification sound
      try {
        if (!notifAudioRef.current) {
          notifAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Bfnl0dHyAgYF9eXl+g4SEfnh3fIOIiIV+e3t/hYqKh4J9fH+Fioq...');
        }
        notifAudioRef.current.play().catch(() => {});
      } catch { /* audio not available */ }
    } else if (data.status === 'DELIVERED') {
      markNotifDelivered(data.itemId);
    }
  });

  // Also poll the notification store periodically for cross-tab/cross-page notifications
  // (KDS page writes to the store, this page reads it)
  const lastNotifCheckRef = useRef(0);
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useNotificationsStore.getState();
      const newItems = store.readyItems.filter(
        (n) => n.status === 'READY' && n.timestamp > lastNotifCheckRef.current
      );
      if (newItems.length > 0) {
        lastNotifCheckRef.current = Date.now();
        newItems.forEach((n) => {
          toast(
            `🔔 ${n.tableName || 'Mesa ' + n.tableNumber}: ${n.itemName} está listo!`,
            { duration: 5000, icon: '🍽️', id: `notif-${n.id}`, style: { fontWeight: 'bold' } }
          );
        });
        // Play sound for first notification
        try {
          if (!notifAudioRef.current) {
            notifAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Bfnl0dHyAgYF9eXl+g4SEfnh3fIOIiIV+e3t/hYqKh4J9fH+Fioq...');
          }
          notifAudioRef.current.play().catch(() => {});
        } catch { /* audio not available */ }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Canvas ref for scrolling
  const canvasRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Initialize demo data
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Data Initialization - Single source of truth from backend
  // ---------------------------------------------------------------------------
  const initializedRef = useRef(false);

  // Step 1: Fetch backend data on mount
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('maki_token') : null;
    const branchId = typeof window !== 'undefined' ? localStorage.getItem('maki_branch_id') : null;
    console.log('[MESAS] Mount: token=', token ? (token === 'demo-token-makicore' ? 'DEMO TOKEN' : token.slice(0, 20) + '...') : 'null', 'branchId=', branchId);
    fetchTables();
    fetchZones();
    fetchActiveOrders();
  }, [fetchTables, fetchZones, fetchActiveOrders]);

  // Step 2: Build canvasTables from storeTables (backend) once available
  useEffect(() => {
    if (storeTables.length === 0) return;

    const isRealBackend = storeTables[0]?.id?.length > 10; // UUIDs are 36 chars
    console.log('[MESAS] useEffect[storeTables] FIRED:', storeTables.length, 'tables, isRealBackend=', isRealBackend, 'first id=', storeTables[0]?.id, 'mergedRef:', activeMergedTablesRef.current.length);
    const occupied = storeTables.filter((t) => t.status === 'OCCUPIED');
    occupied.forEach((t) => {
      const a = t as any; // eslint-disable-line
      console.log(`[MESAS]   OCCUPIED: ${t.name} id=${t.id?.slice(0, 15)} currentOrderId=${a.currentOrderId || 'none'} currentOrder=${a.currentOrder ? '#' + a.currentOrder.orderNumber : 'none'} items=${a.currentOrder?.items?.length ?? 'N/A'}`);
    });

    if (isRealBackend) {
      // ---- BACKEND MODE ----
      // Load saved positions from localStorage (user may have repositioned tables)
      const savedPositions = new Map<string, { x: number; y: number }>();
      try {
        const saved = localStorage.getItem('makiavelo-table-positions');
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, { x: number; y: number }>;
          Object.entries(parsed).forEach(([id, pos]) => savedPositions.set(id, pos));
        }
      } catch { /* ignore */ }

      const mapShape = (s?: string): TableShape => {
        if (!s) return 'round';
        const lower = s.toLowerCase();
        if (lower === 'round' || lower === 'circle') return 'round';
        if (lower === 'square') return 'square';
        if (lower === 'rect' || lower === 'rectangle') return 'rect-horizontal';
        if (lower === 'bar') return 'bar-segment';
        return 'round';
      };

      const resolveZoneName = (t: any): string => { // eslint-disable-line
        if (t.zone?.name) return t.zone.name;
        return 'Salon';
      };

      const newCanvas: CanvasTable[] = storeTables.map((t) => {
        const btAny = t as any; // eslint-disable-line
        const activeOrder = btAny.currentOrder;
        const serverUser = btAny.assignedUser;
        const savedPos = savedPositions.get(t.id);

        return {
          id: t.id,
          number: t.number,
          name: t.name || `Mesa ${t.number}`,
          zoneId: t.zone?.id || t.zoneId,
          zoneName: resolveZoneName(t),
          capacity: t.capacity || 2,
          status: t.status,
          shape: mapShape(t.shape),
          x: savedPos?.x ?? t.posX ?? (80 + ((t.number - 1) % 6) * 140),
          y: savedPos?.y ?? t.posY ?? (80 + Math.floor((t.number - 1) / 6) * 160),
          occupiedAt: t.occupiedAt || activeOrder?.openedAt || activeOrder?.createdAt,
          orderTotal: activeOrder?.total,
          serverName: serverUser ? `${serverUser.firstName || ''} ${serverUser.lastName || ''}`.trim() : undefined,
          currentOrderId: btAny.currentOrderId || activeOrder?.id,
        };
      });

      setCanvasTables(newCanvas);
      if (!initializedRef.current) {
        setReservations(generateDemoReservations());
        initializedRef.current = true;
      }
    } else {
      // ---- DEMO MODE (backend offline) ----
      // Build canvasTables from storeTables (demoTables) to keep order data consistent
      // ALWAYS rebuild when storeTables changes (e.g. after payment updates table status)

      // Use the ref (not stale canvasTables) to get active merged tables
      const existingMerged = activeMergedTablesRef.current;
      const mergedOriginalIds = new Set<string>();
      existingMerged.forEach((mt) => {
        mt.mergedFrom?.forEach((m) => mergedOriginalIds.add(m.id));
      });

      // Load saved positions from localStorage for demo mode too
      const savedPositions = new Map<string, { x: number; y: number }>();
      try {
        const saved = localStorage.getItem('makiavelo-table-positions');
        if (saved) {
          const parsed = JSON.parse(saved) as Record<string, { x: number; y: number }>;
          Object.entries(parsed).forEach(([id, pos]) => savedPositions.set(id, pos));
        }
      } catch { /* ignore */ }

      const demoCanvas: CanvasTable[] = storeTables
        .filter((t) => !mergedOriginalIds.has(t.id)) // Skip tables absorbed into a merge
        .map((t) => {
          const tAny = t as any; // eslint-disable-line
          const activeOrder = tAny.currentOrder;
          const serverUser = tAny.assignedUser;
          const savedPos = savedPositions.get(t.id);
          return {
            id: t.id,
            number: t.number,
            name: t.name || `Mesa ${t.number}`,
            zoneId: t.zone?.id || t.zoneId,
            zoneName: t.zone?.name || 'Salon',
            capacity: t.capacity || 2,
            status: t.status,
            shape: (t.shape === 'bar' ? 'bar-segment' : t.shape === 'rect' ? 'rect-horizontal' : t.shape || 'round') as TableShape,
            x: savedPos?.x ?? t.posX ?? (80 + ((t.number - 1) % 6) * 140),
            y: savedPos?.y ?? t.posY ?? (80 + Math.floor((t.number - 1) / 6) * 160),
            occupiedAt: t.occupiedAt || activeOrder?.createdAt,
            orderTotal: activeOrder?.total,
            serverName: serverUser?.name,
            currentOrderId: tAny.currentOrderId || activeOrder?.id,
          };
        });

      // Re-add merged tables from the ref, applying persisted order state
      let mergedOrderStates: Record<string, { status: string; orderId?: string; orderNumber?: string; occupiedAt?: string; orderTotal?: number }> = {};
      try {
        const saved = localStorage.getItem('makiavelo-merged-table-orders');
        if (saved) mergedOrderStates = JSON.parse(saved);
      } catch { /* ignore */ }

      existingMerged.forEach((mt) => {
        const orderState = mergedOrderStates[mt.id];
        if (orderState && orderState.status === 'OCCUPIED') {
          demoCanvas.push({
            ...mt,
            status: 'OCCUPIED' as TableStatus,
            occupiedAt: orderState.occupiedAt,
            orderTotal: orderState.orderTotal,
            currentOrderId: orderState.orderId,
          });
        } else {
          demoCanvas.push(mt);
        }
      });

      console.log('[MESAS] Demo mode rebuild: built', demoCanvas.length, 'canvasTables from', storeTables.length, 'storeTables. mergedRef:', existingMerged.length, 'merged, mergedOriginalIds:', Array.from(mergedOriginalIds));
      setCanvasTables(demoCanvas);
      if (!initializedRef.current) {
        setReservations(generateDemoReservations());
        initializedRef.current = true;
      }
    }
  }, [storeTables]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3: Persist table positions to localStorage when user drags tables
  useEffect(() => {
    if (canvasTables.length === 0) return;
    // Only persist positions (not full data) to avoid stale order data
    const positions: Record<string, { x: number; y: number }> = {};
    canvasTables.forEach((t) => {
      positions[t.id] = { x: t.x, y: t.y };
    });
    localStorage.setItem('makiavelo-table-positions', JSON.stringify(positions));
  }, [canvasTables]);

  // ---------------------------------------------------------------------------
  // Zone tabs
  // ---------------------------------------------------------------------------
  const zoneTabs = useMemo(() => {
    const counts: Record<string, number> = { all: canvasTables.length };
    const zoneNames: Record<string, string> = {};
    canvasTables.forEach((t) => {
      counts[t.zoneId] = (counts[t.zoneId] || 0) + 1;
      if (t.zoneName && !zoneNames[t.zoneId]) zoneNames[t.zoneId] = t.zoneName;
    });
    // Build dynamic tabs from actual zones found in tables
    const tabs = [{ id: 'all', label: 'Todas', count: counts.all }];
    // If we have known demo zone IDs, use them in order
    const knownOrder = ['salon', 'terraza', 'bar', 'vip'];
    const knownLabels: Record<string, string> = { salon: 'Salon', terraza: 'Terraza', bar: 'Bar', vip: 'VIP' };
    const addedZones = new Set<string>();
    // First add known zones in order
    for (const zId of knownOrder) {
      if (counts[zId] !== undefined) {
        tabs.push({ id: zId, label: knownLabels[zId], count: counts[zId] });
        addedZones.add(zId);
      }
    }
    // Then add any zones from backend that aren't in the known list (UUID zones)
    Object.keys(counts).forEach((zId) => {
      if (zId !== 'all' && !addedZones.has(zId)) {
        const label = zoneNames[zId] || zId.substring(0, 8);
        tabs.push({ id: zId, label, count: counts[zId] });
      }
    });
    return tabs;
  }, [canvasTables]);

  // ---------------------------------------------------------------------------
  // Filtered tables
  // ---------------------------------------------------------------------------
  const filteredTables = useMemo(() => {
    if (!selectedZone || selectedZone === 'all') return canvasTables;
    return canvasTables.filter((t) => t.zoneId === selectedZone);
  }, [canvasTables, selectedZone]);

  // ---------------------------------------------------------------------------
  // Status summary
  // ---------------------------------------------------------------------------
  const statusSummary = useMemo(() => {
    const summary: Record<TableStatus, number> = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      RESERVED: 0,
      CLEANING: 0,
      BLOCKED: 0,
    };
    filteredTables.forEach((t) => {
      summary[t.status]++;
    });
    return summary;
  }, [filteredTables]);

  // ---------------------------------------------------------------------------
  // Reservation assignment logic
  // ---------------------------------------------------------------------------
  const highlightedTableIds = useMemo(() => {
    if (!assigningReservation) return new Set<string>();
    const ids = new Set<string>();
    canvasTables.forEach((t) => {
      if (t.status === 'AVAILABLE' && t.capacity >= assigningReservation.partySize) {
        ids.add(t.id);
      }
    });
    return ids;
  }, [assigningReservation, canvasTables]);

  const bestMatchTableId = useMemo(() => {
    if (!assigningReservation) return null;
    let bestId: string | null = null;
    let bestScore = Infinity;

    canvasTables.forEach((t) => {
      if (t.status !== 'AVAILABLE' || t.capacity < assigningReservation.partySize) return;
      // Score: closer capacity match = better, zone preference = bonus
      let score = t.capacity - assigningReservation.partySize;
      if (assigningReservation.zonePreference && t.zoneId === assigningReservation.zonePreference) {
        score -= 100; // big bonus
      }
      if (score < bestScore) {
        bestScore = score;
        bestId = t.id;
      }
    });

    return bestId;
  }, [assigningReservation, canvasTables]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSaveLayout = useCallback(() => {
    localStorage.setItem('makiavelo-table-layout', JSON.stringify(canvasTables));
    localStorage.setItem('makiavelo-layout-version', 'v2-fusion');
    toast.success('Mapa guardado exitosamente');
  }, [canvasTables]);

  const handleTableDragEnd = useCallback(
    (tableId: string, info: PanInfo, startX: number, startY: number) => {
      const newX = snapToGrid(startX + info.offset.x);
      const newY = snapToGrid(startY + info.offset.y);
      setCanvasTables((prev) =>
        prev.map((t) => {
          if (t.id !== tableId) return t;
          return { ...t, x: Math.max(0, newX), y: Math.max(0, newY) };
        })
      );
    },
    []
  );

  // ---- FUSION FLOW ----
  // Step 1: Open fusion sheet with person count selector
  const handleOpenFusion = useCallback(
    (table: CanvasTable) => {
      setShowTableSheet(false);
      setSelectedTable(null);
      setFusionSourceTable(table);
      setFusionPersonCount(4); // default suggestion
      setFusionPreview([]);
      setShowFusionSheet(true);
    },
    []
  );

  // Step 2: Update preview when person count changes
  const handleFusionCountChange = useCallback(
    (count: number) => {
      setFusionPersonCount(count);
      if (!fusionSourceTable) return;
      const nearby = findNearestAvailableTables(fusionSourceTable, canvasTables, count);
      setFusionPreview(nearby);
    },
    [fusionSourceTable, canvasTables]
  );

  // Step 3: Execute the fusion
  const handleExecuteFusion = useCallback(
    () => {
      if (!fusionSourceTable || fusionPreview.length === 0) return;

      // All tables that will be merged (source + nearby)
      const allTables = [fusionSourceTable, ...fusionPreview];
      const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);
      const mergedShape = getMergedShape(totalCapacity);

      // Build merge tracking
      const allMergedFrom: MergedTableInfo[] = allTables.flatMap((t) => {
        if (t.mergedFrom && t.mergedFrom.length > 0) return t.mergedFrom;
        return [{
          id: t.id,
          number: t.number,
          name: t.name,
          capacity: t.capacity,
          shape: t.shape,
          originalX: t.x,
          originalY: t.y,
        }];
      });

      const minNumber = Math.min(...allMergedFrom.map((m) => m.number));

      const mergedTable: CanvasTable = {
        id: `merged-${Date.now()}`,
        number: minNumber,
        name: `Mesa ${minNumber}`,
        zoneId: fusionSourceTable.zoneId,
        zoneName: fusionSourceTable.zoneName,
        capacity: totalCapacity,
        status: 'AVAILABLE',
        shape: mergedShape,
        x: fusionSourceTable.x,
        y: fusionSourceTable.y,
        isMerged: true,
        mergedFrom: allMergedFrom,
      };

      const idsToRemove = new Set(allTables.map((t) => t.id));

      // Track merged table in ref + localStorage so it survives navigation
      setMergedTables([
        ...activeMergedTablesRef.current.filter((mt) => !idsToRemove.has(mt.id)),
        mergedTable,
      ]);
      console.log('[FUSION] Executing fusion. idsToRemove:', Array.from(idsToRemove), 'mergedTable:', mergedTable.id, 'ref now has:', activeMergedTablesRef.current.length, 'merged tables');

      setCanvasTables((prev) => {
        const filtered = prev.filter((t) => !idsToRemove.has(t.id));
        console.log('[FUSION] setCanvasTables: prev had', prev.length, 'tables, filtered to', filtered.length, ', returning', filtered.length + 1);
        return [...filtered, mergedTable];
      });

      const tableNumbers = allTables.map((t) => t.number).join(' + ');
      toast.success(`Mesa ${tableNumbers} fusionadas = ${totalCapacity} personas`, { icon: '🔗', duration: 3000 });

      setShowFusionSheet(false);
      setFusionSourceTable(null);
      setFusionPreview([]);
    },
    [fusionSourceTable, fusionPreview]
  );

  // Computed: IDs of tables in fusion preview (for highlighting on canvas)
  const fusionPreviewIds = useMemo(() => {
    const ids = new Set<string>();
    if (fusionSourceTable) ids.add(fusionSourceTable.id);
    fusionPreview.forEach((t) => ids.add(t.id));
    return ids;
  }, [fusionSourceTable, fusionPreview]);

  // ---- SPLIT FLOW ----
  // Open split sheet (blocked if table has active order)
  const handleOpenSplit = useCallback(
    (table: CanvasTable) => {
      // Block split if table is occupied (has active order / food sent)
      if (table.status === 'OCCUPIED') {
        toast.error('No puedes separar mesas con una cuenta abierta. Primero cobra la cuenta.', { duration: 3000, icon: '🚫' });
        return;
      }
      setShowTableSheet(false);
      setSelectedTable(null);
      setSplitSourceTable(table);
      setSplitCount(table.mergedFrom ? table.mergedFrom.length : 1);
      setShowSplitSheet(true);
    },
    []
  );

  // Execute split - detach splitCount tables from the merged group
  const handleExecuteSplit = useCallback(
    () => {
      if (!splitSourceTable || !splitSourceTable.mergedFrom) return;

      const mergedParts = splitSourceTable.mergedFrom;

      if (splitCount >= mergedParts.length) {
        // Separate ALL tables
        const restoredTables: CanvasTable[] = mergedParts.map((info, idx) => ({
          id: info.id.startsWith('merged-') ? `t${Date.now()}-${idx}` : info.id,
          number: info.number,
          name: info.name,
          zoneId: splitSourceTable.zoneId,
          zoneName: splitSourceTable.zoneName,
          capacity: info.capacity,
          status: 'AVAILABLE' as TableStatus,
          shape: info.shape,
          x: info.originalX,
          y: info.originalY,
        }));

        // Remove from merged ref + localStorage since it's fully split
        setMergedTables(activeMergedTablesRef.current.filter(
          (mt) => mt.id !== splitSourceTable.id
        ));

        setCanvasTables((prev) => {
          const filtered = prev.filter((t) => t.id !== splitSourceTable.id);
          return [...filtered, ...restoredTables];
        });

        toast.success(`${mergedParts.length} mesas separadas`, { icon: '✂️' });
      } else {
        // Partial split: detach the last `splitCount` tables
        const toDetach = mergedParts.slice(-splitCount);
        const toKeep = mergedParts.slice(0, mergedParts.length - splitCount);

        const detachedTables: CanvasTable[] = toDetach.map((info, idx) => ({
          id: info.id.startsWith('merged-') ? `t${Date.now()}-${idx}` : info.id,
          number: info.number,
          name: info.name,
          zoneId: splitSourceTable.zoneId,
          zoneName: splitSourceTable.zoneName,
          capacity: info.capacity,
          status: 'AVAILABLE' as TableStatus,
          shape: info.shape,
          x: info.originalX,
          y: info.originalY,
        }));

        if (toKeep.length === 1) {
          // Only one table left - restore it as a normal table
          const single = toKeep[0];
          const restoredSingle: CanvasTable = {
            id: single.id.startsWith('merged-') ? `t${Date.now()}-single` : single.id,
            number: single.number,
            name: single.name,
            zoneId: splitSourceTable.zoneId,
            zoneName: splitSourceTable.zoneName,
            capacity: single.capacity,
            status: splitSourceTable.status,
            shape: single.shape,
            x: splitSourceTable.x,
            y: splitSourceTable.y,
          };

          // Remove from merged ref + localStorage since only 1 table left (no longer merged)
          setMergedTables(activeMergedTablesRef.current.filter(
            (mt) => mt.id !== splitSourceTable.id
          ));

          setCanvasTables((prev) => {
            const filtered = prev.filter((t) => t.id !== splitSourceTable.id);
            return [...filtered, restoredSingle, ...detachedTables];
          });
        } else {
          // Still a merged table, just smaller
          const remainingCapacity = toKeep.reduce((sum, m) => sum + m.capacity, 0);
          const remainingTable: CanvasTable = {
            ...splitSourceTable,
            id: `merged-${Date.now()}`,
            capacity: remainingCapacity,
            name: `Mesa ${Math.min(...toKeep.map((m) => m.number))}`,
            shape: getMergedShape(remainingCapacity),
            isMerged: true,
            mergedFrom: toKeep,
          };

          // Update merged ref + localStorage: replace old merged table with smaller one
          setMergedTables([
            ...activeMergedTablesRef.current.filter((mt) => mt.id !== splitSourceTable.id),
            remainingTable,
          ]);

          setCanvasTables((prev) => {
            const filtered = prev.filter((t) => t.id !== splitSourceTable.id);
            return [...filtered, remainingTable, ...detachedTables];
          });
        }

        toast.success(`${splitCount} mesa(s) separada(s)`, { icon: '✂️' });
      }

      setShowSplitSheet(false);
      setSplitSourceTable(null);
    },
    [splitSourceTable, splitCount]
  );

  const handleTableTap = useCallback(
    (table: CanvasTable) => {
      if (isEditMode) {
        setEditingTable(table);
        setShowEditProps(true);
        return;
      }

      if (assigningReservation) {
        if (highlightedTableIds.has(table.id)) {
          // Assign reservation to this table
          setReservations((prev) =>
            prev.map((r) => (r.id === assigningReservation.id ? { ...r, assignedTableId: table.id } : r))
          );
          setCanvasTables((prev) =>
            prev.map((t) => (t.id === table.id ? { ...t, status: 'RESERVED' as TableStatus } : t))
          );
          toast.success(`Reserva de ${assigningReservation.guestName} asignada a Mesa ${table.number}`);
          setAssigningReservation(null);
        } else {
          toast.error('Esta mesa no esta disponible o es muy pequena');
        }
        return;
      }

      setSelectedTable(table);
      setShowTableSheet(true);
    },
    [isEditMode, assigningReservation, highlightedTableIds]
  );

  const handleOpenOrder = useCallback(
    (table: CanvasTable) => {
      setTable(table.id, table.name);
      setShowTableSheet(false);
      router.push('/pedidos');
    },
    [setTable, router]
  );

  const handleViewOrder = useCallback(
    async (table: CanvasTable) => {
      setShowTableSheet(false);
      setBillTable(table);
      setBillOrder(null);
      setBillLoading(true);
      setShowBillSheet(true);

      console.log('[VER_CUENTA] === Starting for table:', table.name, 'id:', table.id, 'currentOrderId:', table.currentOrderId);

      let foundOrder: import('@/types').Order | null = null;

      // Strategy 1: Fetch order by ID from backend (if we have a valid UUID orderId)
      if (table.currentOrderId && table.currentOrderId.length > 10) {
        console.log('[VER_CUENTA] Strategy 1: fetchOrder by ID', table.currentOrderId);
        try {
          const order = await fetchOrder(table.currentOrderId);
          console.log('[VER_CUENTA] Strategy 1 result:', order ? `Order #${order.orderNumber} items=${order.items?.length}` : 'null');
          if (order) {
            foundOrder = order;
          }
        } catch (err) {
          console.error('[VER_CUENTA] Strategy 1 error:', err);
        }
      } else {
        console.log('[VER_CUENTA] Strategy 1 skipped: no valid currentOrderId');
      }

      // Strategy 2: Fetch active orders for this table from backend by tableId
      if (!foundOrder) {
        console.log('[VER_CUENTA] Strategy 2: fetchOrdersByTable', table.id);
        try {
          const tableOrders = await fetchOrdersByTable(table.id);
          console.log('[VER_CUENTA] Strategy 2 result:', tableOrders.length, 'orders');
          if (tableOrders.length > 0) {
            foundOrder = tableOrders[0];
            console.log('[VER_CUENTA] Strategy 2 found:', `Order #${foundOrder?.orderNumber} items=${foundOrder?.items?.length}`);
            // Update the canvas table with the real order ID
            if (foundOrder) {
              setCanvasTables((prev) =>
                prev.map((ct) =>
                  ct.id === table.id
                    ? { ...ct, currentOrderId: foundOrder!.id, orderTotal: foundOrder!.total }
                    : ct
                )
              );
            }
          }
        } catch (err) {
          console.error('[VER_CUENTA] Strategy 2 error:', err);
        }
      }

      // Strategy 3: Check activeOrders in memory
      if (!foundOrder) {
        console.log('[VER_CUENTA] Strategy 3: activeOrders in memory, count:', activeOrders.length);
        const byTableId = activeOrders.find((o) => o.tableId === table.id);
        const byOrderId = table.currentOrderId ? activeOrders.find((o) => o.id === table.currentOrderId) : undefined;
        foundOrder = byTableId || byOrderId || null;
        console.log('[VER_CUENTA] Strategy 3 result: byTableId=', !!byTableId, 'byOrderId=', !!byOrderId);
      }

      // Strategy 4: Check storeTables for embedded order data
      if (!foundOrder) {
        console.log('[VER_CUENTA] Strategy 4: storeTables embedded order');
        const storeTable = storeTables.find((t) => t.id === table.id);
        if (storeTable) {
          const stAny = storeTable as any; // eslint-disable-line
          console.log('[VER_CUENTA] Strategy 4: storeTable found, currentOrder=', !!stAny.currentOrder, 'items=', stAny.currentOrder?.items?.length);
          if (stAny.currentOrder) {
            foundOrder = stAny.currentOrder;
          }
        } else {
          console.log('[VER_CUENTA] Strategy 4: storeTable not found for id:', table.id);
        }
      }

      console.log('[VER_CUENTA] === FINAL RESULT:', foundOrder ? `Order #${foundOrder.orderNumber} items=${foundOrder.items?.length} total=${foundOrder.total}` : 'NULL - no order found');
      if (foundOrder?.items) {
        foundOrder.items.forEach((it: any) => { // eslint-disable-line
          console.log('[VER_CUENTA]   Item:', it.quantity, 'x', it.name || it.product?.name || it.productId, '@ $' + it.unitPrice);
        });
      }

      setBillOrder(foundOrder);
      setBillLoading(false);
    },
    [fetchOrder, fetchOrdersByTable, activeOrders, storeTables] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCharge = useCallback(
    (table: CanvasTable) => {
      setShowTableSheet(false);
      const params = new URLSearchParams();
      params.set('tableId', table.id);
      if (table.currentOrderId) params.set('orderId', table.currentOrderId);
      router.push(`/cobro?${params.toString()}`);
    },
    [router]
  );

  const handleStatusChange = useCallback(
    (table: CanvasTable, newStatus: TableStatus) => {
      setCanvasTables((prev) =>
        prev.map((t) => {
          if (t.id !== table.id) return t;
          const updated = { ...t, status: newStatus };
          if (newStatus === 'AVAILABLE') {
            updated.occupiedAt = undefined;
            updated.orderTotal = undefined;
            updated.serverName = undefined;
            updated.currentOrderId = undefined;
          }
          return updated;
        })
      );

      // Clean up merged table order state from localStorage
      if (table.id.startsWith('merged-')) {
        try {
          const key = 'makiavelo-merged-table-orders';
          const existing = JSON.parse(localStorage.getItem(key) || '{}');
          if (newStatus === 'AVAILABLE') {
            delete existing[table.id];
          } else {
            existing[table.id] = {
              ...existing[table.id],
              status: newStatus,
              occupiedAt: newStatus === 'OCCUPIED' ? new Date().toISOString() : existing[table.id]?.occupiedAt,
            };
          }
          localStorage.setItem(key, JSON.stringify(existing));
        } catch { /* ignore */ }

        // Also update the merged tables ref so it persists across navigation
        const updatedMerged = activeMergedTablesRef.current.map((mt) => {
          if (mt.id !== table.id) return mt;
          const updated = { ...mt, status: newStatus };
          if (newStatus === 'AVAILABLE') {
            updated.occupiedAt = undefined;
            updated.orderTotal = undefined;
            updated.serverName = undefined;
            updated.currentOrderId = undefined;
          }
          return updated;
        });
        setMergedTables(updatedMerged);
      }

      // Also clear notifications for this table when set to AVAILABLE
      if (newStatus === 'AVAILABLE') {
        const notifs = useNotificationsStore.getState().readyItems.filter(
          (n) => n.tableNumber === table.number
        );
        notifs.forEach((n) => removeNotification(n.id));
      }

      setShowTableSheet(false);
      toast.success(`Mesa ${table.number}: ${STATUS_LABELS[newStatus]}`);
    },
    [setMergedTables, removeNotification] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleAddTable = useCallback(
    (shape: TableShape, capacity: number, zoneId: string) => {
      const zoneNames: Record<string, string> = { salon: 'Salon', terraza: 'Terraza', bar: 'Bar', vip: 'VIP' };
      const maxNumber = canvasTables.reduce((max, t) => Math.max(max, t.number), 0);
      const newNumber = maxNumber + 1;

      // Place near center of canvas with small offset
      const baseX = 300 + Math.random() * 200;
      const baseY = 300 + Math.random() * 200;

      const newTable: CanvasTable = {
        id: `t${Date.now()}`,
        number: newNumber,
        name: `Mesa ${newNumber}`,
        zoneId,
        zoneName: zoneNames[zoneId] || zoneId,
        capacity,
        status: 'AVAILABLE',
        shape,
        x: snapToGrid(baseX),
        y: snapToGrid(baseY),
      };

      setCanvasTables((prev) => [...prev, newTable]);
      setShowAddSheet(false);
      toast.success(`Mesa ${newNumber} agregada`);
    },
    [canvasTables]
  );

  const handleUpdateTableProps = useCallback(
    (tableId: string, updates: Partial<CanvasTable>) => {
      setCanvasTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, ...updates } : t))
      );
      if (editingTable && editingTable.id === tableId) {
        setEditingTable((prev) => (prev ? { ...prev, ...updates } : prev));
      }
    },
    [editingTable]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      setCanvasTables((prev) => prev.filter((t) => t.id !== tableId));
      setShowEditProps(false);
      setEditingTable(null);
      toast.success('Mesa eliminada');
    },
    []
  );

  const handleTransfer = useCallback(
    (table: CanvasTable) => {
      setShowTableSheet(false);
      toast('Funcionalidad de transferir mesa disponible proximamente', { icon: 'i' });
    },
    []
  );

  const nextTableNumber = useMemo(() => {
    return canvasTables.reduce((max, t) => Math.max(max, t.number), 0) + 1;
  }, [canvasTables]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <RequirePermission permission="tables">
    <MainLayout>
      <Header
        title="Mapa de Mesas"
        subtitle={`${filteredTables.length} mesas`}
        actions={
          <div className="flex items-center gap-2">
            {/* Reservations toggle */}
            <button
              onClick={() => {
                setShowReservations(!showReservations);
                if (assigningReservation) setAssigningReservation(null);
              }}
              className={cn(
                'min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl transition-all touch-manipulation',
                showReservations ? 'bg-maki-gold text-white shadow-md' : 'hover:bg-gray-100 active:bg-gray-200'
              )}
            >
              <CalendarDaysIcon className="w-6 h-6" />
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchTables();
                toast.success('Mapa actualizado');
              }}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            >
              <ArrowPathIcon className={cn('w-5 h-5 text-gray-500', isLoading && 'animate-spin')} />
            </button>

            {/* Edit mode toggle */}
            <Button
              variant={isEditMode ? 'danger' : 'outline'}
              size="md"
              icon={isEditMode ? <XMarkIcon className="w-5 h-5" /> : <PencilSquareIcon className="w-5 h-5" />}
              onClick={() => {
                if (isEditMode) {
                  handleSaveLayout();
                }
                setIsEditMode(!isEditMode);
                if (assigningReservation) setAssigningReservation(null);
              }}
            >
              {isEditMode ? 'Salir' : 'Editar Mapa'}
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Zone Tabs */}
        <div className="px-4 pt-3 pb-2">
          <Tabs
            tabs={zoneTabs}
            activeTab={selectedZone || 'all'}
            onChange={(id) => setSelectedZone(id === 'all' ? null : id)}
            variant="pills"
            size="md"
          />
        </div>

        {/* Status summary bar */}
        <div className="px-4 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {(Object.entries(statusSummary) as [TableStatus, number][]).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm text-sm whitespace-nowrap"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-gray-500">{STATUS_LABELS[status]}</span>
              <span className="font-bold text-maki-dark">{count}</span>
            </div>
          ))}
          {/* Ready items indicator */}
          {readyItems.filter((n) => n.status === 'READY').length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-fuchsia-50 border border-fuchsia-300 rounded-lg shadow-sm text-sm whitespace-nowrap animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-fuchsia-500" />
              <span className="text-fuchsia-700 font-semibold">Comida Lista</span>
              <span className="font-bold text-fuchsia-800">{readyItems.filter((n) => n.status === 'READY').length}</span>
            </div>
          )}
        </div>

        {/* Reservation assignment banner */}
        <AnimatePresence>
          {assigningReservation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-4 mb-2 p-3 bg-maki-gold/10 border border-maki-gold/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-maki-gold/20 rounded-full flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-maki-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-maki-dark">
                      Asignando: {assigningReservation.guestName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {assigningReservation.partySize} personas - Toca una mesa verde disponible
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAssigningReservation(null)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 transition-colors touch-manipulation"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit mode toolbar */}
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <PencilSquareIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Modo Edicion</p>
                    <p className="text-xs text-amber-600">Arrastra mesas para moverlas o toca para editar</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => setShowAddSheet(true)}
                  >
                    Mesa
                  </Button>
                  <Button
                    variant="success"
                    size="md"
                    icon={<CheckIcon className="w-5 h-5" />}
                    onClick={() => {
                      handleSaveLayout();
                      setIsEditMode(false);
                    }}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area: Canvas + optional reservations panel */}
        <div className="flex-1 overflow-hidden flex">
          {/* Canvas area */}
          <div className="flex-1 overflow-auto bg-maki-light/50" ref={canvasRef}>
            <div
              className="relative"
              style={{ minWidth: CANVAS_W, minHeight: CANVAS_H }}
            >
              {/* Zone background areas */}
              <ZoneBackgrounds tables={canvasTables} selectedZone={selectedZone} />

              {/* Grid dots (edit mode) */}
              {isEditMode && (
                <svg
                  className="absolute inset-0 pointer-events-none opacity-20"
                  width="100%"
                  height="100%"
                >
                  <defs>
                    <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                      <circle cx={GRID_SIZE / 2} cy={GRID_SIZE / 2} r={1} fill="#9CA3AF" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              )}

              {/* Tables */}
              <AnimatePresence>
                {canvasTables.map((table) => {
                  const dim = getTableDimensions(table.shape, table.capacity);
                  const padding = 20;
                  const svgW = dim.w + padding * 2;
                  const svgH = dim.h + padding * 2;

                  const isZoneFiltered = selectedZone && selectedZone !== 'all' && table.zoneId !== selectedZone;
                  const isHighlighted = highlightedTableIds.has(table.id);
                  const isBest = bestMatchTableId === table.id;
                  const isFusionHighlighted = fusionPreviewIds.has(table.id);
                  const isDimmed = assigningReservation
                    ? !highlightedTableIds.has(table.id)
                    : showFusionSheet
                    ? !fusionPreviewIds.has(table.id)
                    : !!isZoneFiltered;

                  return (
                    <motion.div
                      key={table.id}
                      className={cn(
                        'absolute touch-manipulation',
                        isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                        isDimmed && 'pointer-events-none'
                      )}
                      style={{
                        left: table.x - padding,
                        top: table.y - padding,
                        width: svgW,
                        height: svgH,
                        zIndex: isFusionHighlighted ? 25 : isHighlighted ? 20 : isDimmed ? 1 : 10,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: isDimmed ? 0.35 : 1,
                        scale: 1,
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25 }}
                      drag={isEditMode}
                      dragMomentum={false}
                      dragElastic={0}
                      onDragEnd={(_, info) => {
                        handleTableDragEnd(table.id, info, table.x - padding, table.y - padding);
                      }}
                      onTap={() => {
                        if (!isDimmed) handleTableTap(table);
                      }}
                      whileTap={!isEditMode ? { scale: 0.95 } : undefined}
                    >
                      <TableShapeSVG
                        table={table}
                        isEditMode={isEditMode}
                        isHighlighted={isHighlighted || isFusionHighlighted}
                        isBestMatch={isBest}
                        isDimmed={isDimmed}
                        isMergeTarget={false}
                        isMergedTable={!!table.isMerged}
                        colorOverride={
                          // Green when food is READY for this table
                          table.status === 'OCCUPIED' &&
                          readyItems.some((n) => n.status === 'READY' && n.tableNumber === table.number)
                            ? '#D946EF' // Fuchsia-500: food is ready!
                            : undefined
                        }
                      />

                      {/* Elapsed time badge for occupied */}
                      {table.status === 'OCCUPIED' && table.occupiedAt && !isDimmed && (
                        <div className="absolute -top-1 -right-1 bg-maki-gold text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                          <ClockIcon className="w-3 h-3" />
                          {formatElapsedTime(table.occupiedAt)}
                        </div>
                      )}

                      {/* Order total badge for occupied */}
                      {table.status === 'OCCUPIED' && table.orderTotal && !isDimmed && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-maki-dark text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-gray-100">
                          {formatCurrency(table.orderTotal)}
                        </div>
                      )}

                      {/* Suggested badge */}
                      {isBest && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-maki-gold text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 whitespace-nowrap">
                          <StarIcon className="w-3 h-3" />
                          Sugerida
                        </div>
                      )}

                      {/* Merged table badge */}
                      {table.isMerged && table.mergedFrom && !isDimmed && (
                        <div className="absolute -top-2 -left-1 bg-purple-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5 whitespace-nowrap">
                          <LinkIcon className="w-3 h-3" />
                          {table.mergedFrom.length} mesas
                        </div>
                      )}

                      {/* Ready items badge - notification for mesero */}
                      {!isDimmed && (() => {
                        const readyCount = readyItems.filter(
                          (n) => n.status === 'READY' && n.tableNumber === table.number
                        ).length;
                        if (readyCount === 0) return null;
                        return (
                          <div className="absolute -top-3 right-0 bg-fuchsia-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 animate-bounce whitespace-nowrap">
                            🔔 {readyCount} listo{readyCount > 1 ? 's' : ''}
                          </div>
                        );
                      })()}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Reservations side panel */}
          <AnimatePresence>
            {showReservations && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 340, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-white border-l border-gray-200 overflow-hidden flex-shrink-0"
              >
                <div className="w-[340px] h-full flex flex-col">
                  {/* Panel header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-maki-dark">Proximas Reservas</h3>
                      <p className="text-xs text-gray-400">Hoy, {new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowReservations(false);
                        setAssigningReservation(null);
                      }}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors touch-manipulation"
                    >
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Reservation cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {reservations.map((res) => {
                      const resTime = new Date(res.time);
                      const timeStr = resTime.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', hour12: true });
                      const isAssigned = !!res.assignedTableId;
                      const assignedTable = isAssigned ? canvasTables.find((t) => t.id === res.assignedTableId) : null;
                      const isActiveAssignment = assigningReservation?.id === res.id;

                      return (
                        <motion.div
                          key={res.id}
                          layout
                          className={cn(
                            'rounded-xl border p-3 transition-all',
                            isActiveAssignment
                              ? 'border-maki-gold bg-maki-gold/5 shadow-md'
                              : isAssigned
                              ? 'border-green-200 bg-green-50/50'
                              : 'border-gray-200 bg-white hover:shadow-sm'
                          )}
                        >
                          {/* Time and guest info */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                                isAssigned ? 'bg-green-500' : 'bg-maki-dark'
                              )}>
                                {timeStr.split(':')[0]}:{timeStr.split(':')[1]?.split(' ')[0]}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-maki-dark leading-tight">{res.guestName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                                    <UsersIcon className="w-3.5 h-3.5" />
                                    {res.partySize}
                                  </span>
                                  <span className="flex items-center gap-0.5 text-xs text-gray-500">
                                    <PhoneIcon className="w-3.5 h-3.5" />
                                    {res.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          {res.notes && (
                            <div className="flex items-start gap-1.5 mb-2">
                              <ChatBubbleLeftIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-gray-500 leading-relaxed">{res.notes}</p>
                            </div>
                          )}

                          {/* Zone preference */}
                          {res.zonePreference && (
                            <div className="mb-2">
                              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full">
                                Prefiere: {res.zonePreference}
                              </span>
                            </div>
                          )}

                          {/* Action / status */}
                          {isAssigned && assignedTable ? (
                            <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
                              <CheckCircleIcon className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                Asignada: Mesa {assignedTable.number}
                              </span>
                            </div>
                          ) : (
                            <Button
                              variant={isActiveAssignment ? 'danger' : 'primary'}
                              size="md"
                              fullWidth
                              icon={isActiveAssignment ? <XMarkIcon className="w-5 h-5" /> : <Squares2X2Icon className="w-5 h-5" />}
                              onClick={() => {
                                if (isActiveAssignment) {
                                  setAssigningReservation(null);
                                } else {
                                  setAssigningReservation(res);
                                }
                              }}
                            >
                              {isActiveAssignment ? 'Cancelar' : 'Asignar Mesa'}
                            </Button>
                          )}
                        </motion.div>
                      );
                    })}

                    {reservations.length === 0 && (
                      <div className="text-center py-8">
                        <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No hay reservas para hoy</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ---------- Bottom Sheet: Table Actions (View Mode) ---------- */}
      <BottomSheet
        isOpen={showTableSheet && !!selectedTable}
        onClose={() => {
          setShowTableSheet(false);
          setSelectedTable(null);
        }}
        title={selectedTable?.name || 'Mesa'}
      >
        {selectedTable && (
          <div className="space-y-4">
            {/* Table info row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: STATUS_COLORS[selectedTable.status] }}
              >
                {STATUS_LABELS[selectedTable.status]}
              </span>
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <UsersIcon className="w-4 h-4" />
                {selectedTable.capacity} personas
              </span>
              <span className="text-sm text-gray-400">{selectedTable.zoneName}</span>
            </div>

            {/* Occupied info */}
            {selectedTable.status === 'OCCUPIED' && (
              <div className="bg-maki-gold/5 border border-maki-gold/20 rounded-xl p-4 space-y-2">
                {selectedTable.orderTotal !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total de cuenta</span>
                    <span className="text-lg font-bold text-maki-dark">{formatCurrency(selectedTable.orderTotal)}</span>
                  </div>
                )}
                {selectedTable.serverName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Mesero</span>
                    <span className="text-sm font-semibold text-maki-dark flex items-center gap-1">
                      <UserIcon className="w-4 h-4" />
                      {selectedTable.serverName}
                    </span>
                  </div>
                )}
                {selectedTable.occupiedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Tiempo</span>
                    <span className="text-sm font-semibold text-maki-gold flex items-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      {formatElapsedTime(selectedTable.occupiedAt)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Comanda status with delivery actions */}
            {selectedTable.status === 'OCCUPIED' && (() => {
              // Try multiple sources to find the order
              const order: import('@/types').Order | undefined = activeOrders.find((o) => o.id === selectedTable.currentOrderId)
                || activeOrders.find((o) => o.tableId === selectedTable.id)
                || (storeTables.find((t) => t.id === selectedTable.id) as any)?.currentOrder; // eslint-disable-line

              // Get ready notifications for this table
              const tableReadyNotifs = readyItems.filter(
                (n) => n.tableNumber === selectedTable.number
              );
              const readyNotifs = tableReadyNotifs.filter((n) => n.status === 'READY');
              const deliveredNotifs = tableReadyNotifs.filter((n) => n.status === 'DELIVERED');

              // Merge: use order items if available, enhanced with notification statuses
              const hasOrder = order && order.items && order.items.length > 0;
              const hasNotifs = tableReadyNotifs.length > 0;

              if (!hasOrder && !hasNotifs) return null;

              const statusStyles: Record<string, { bg: string; text: string; label: string; icon: string }> = {
                PENDING: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pendiente', icon: '⏳' },
                PREPARING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Preparando', icon: '🟡' },
                READY: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Listo', icon: '🟢' },
                DELIVERED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Entregado', icon: '✅' },
                SERVED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Servido', icon: '✅' },
              };

              // Resolve item status: prefer notification status if available
              const getItemStatus = (itemId: string, originalStatus: string) => {
                const notif = tableReadyNotifs.find((n) => n.itemId === itemId);
                if (notif) return notif.status;
                return originalStatus;
              };

              const handleDeliverItem = async (itemId: string) => {
                // Try backend first
                try {
                  await api.post(`/api/v1/kds/items/${itemId}/deliver`);
                } catch {
                  // Demo mode fallback
                }
                // Update notification store
                markNotifDelivered(itemId);
                toast.success('Item entregado ✅', { duration: 1500 });
              };

              const handleDeliverAll = async () => {
                for (const notif of readyNotifs) {
                  try {
                    await api.post(`/api/v1/kds/items/${notif.itemId}/deliver`);
                  } catch {
                    // Demo mode
                  }
                  markNotifDelivered(notif.itemId);
                }
                toast.success('Todos los platos entregados ✅', { duration: 2000 });
              };

              // Count items by status
              const totalItems = hasOrder ? order!.items.length : tableReadyNotifs.length;
              const deliveredCount = hasOrder
                ? order!.items.filter((i) => getItemStatus(i.id, i.status) === 'DELIVERED').length
                : deliveredNotifs.length;

              return (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-maki-dark flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-maki-gold" />
                      {hasOrder ? `Comanda #${order!.orderNumber}` : 'Platos del pedido'}
                    </span>
                    <div className="flex items-center gap-2">
                      {totalItems > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                          {deliveredCount}/{totalItems} entregados
                        </span>
                      )}
                      {hasOrder && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-maki-gold/10 text-maki-gold font-bold">
                          {order!.status === 'IN_PROGRESS' ? 'En Cocina' : order!.status === 'OPEN' ? 'Abierta' : order!.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {totalItems > 0 && (
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${(deliveredCount / totalItems) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {hasOrder ? (
                      // Show order items with enhanced statuses
                      order!.items.map((item) => {
                        const resolvedStatus = getItemStatus(item.id, item.status);
                        const style = statusStyles[resolvedStatus] || statusStyles.PENDING;
                        const isReady = resolvedStatus === 'READY';
                        return (
                          <div key={item.id} className={cn(
                            'flex items-center justify-between py-2 border-b border-gray-100 last:border-0 rounded-lg px-2',
                            isReady && 'bg-emerald-50'
                          )}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm">{style.icon}</span>
                              <span className="text-sm font-bold text-maki-gold w-6 text-center">{item.quantity}x</span>
                              <span className="text-sm font-medium text-maki-dark truncate">{item.name || (item as any).product?.name || item.productId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap', style.bg, style.text)}>
                                {style.label}
                              </span>
                              {isReady && (
                                <button
                                  onClick={() => handleDeliverItem(item.id)}
                                  className="text-xs font-bold px-3 py-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:scale-95 transition-all touch-manipulation whitespace-nowrap"
                                >
                                  Entregar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Show notification items only (no order available)
                      tableReadyNotifs.map((notif) => {
                        const style = statusStyles[notif.status] || statusStyles.READY;
                        const isReady = notif.status === 'READY';
                        return (
                          <div key={notif.id} className={cn(
                            'flex items-center justify-between py-2 border-b border-gray-100 last:border-0 rounded-lg px-2',
                            isReady && 'bg-emerald-50'
                          )}>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm">{style.icon}</span>
                              <span className="text-sm font-bold text-maki-gold w-6 text-center">{notif.quantity || 1}x</span>
                              <span className="text-sm font-medium text-maki-dark truncate">{notif.itemName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap', style.bg, style.text)}>
                                {style.label}
                              </span>
                              {isReady && (
                                <button
                                  onClick={() => handleDeliverItem(notif.itemId)}
                                  className="text-xs font-bold px-3 py-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 active:scale-95 transition-all touch-manipulation whitespace-nowrap"
                                >
                                  Entregar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Deliver all button */}
                  {readyNotifs.length > 1 && (
                    <button
                      onClick={handleDeliverAll}
                      className="w-full mt-3 min-h-[44px] bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 active:scale-[0.98] transition-all touch-manipulation flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Entregar Todo ({readyNotifs.length} platos)
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Action buttons based on status */}
            <div className="space-y-2">
              {selectedTable.status === 'AVAILABLE' && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<PlusIcon className="w-6 h-6" />}
                    onClick={() => handleOpenOrder(selectedTable)}
                  >
                    Abrir Cuenta
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    icon={<LinkIcon className="w-6 h-6" />}
                    onClick={() => handleOpenFusion(selectedTable)}
                  >
                    Fusionar Mesa
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    icon={<CalendarDaysIcon className="w-6 h-6" />}
                    onClick={() => {
                      handleStatusChange(selectedTable, 'RESERVED');
                    }}
                  >
                    Reservar
                  </Button>
                </>
              )}

              {selectedTable.status === 'OCCUPIED' && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<EyeIcon className="w-6 h-6" />}
                    onClick={() => handleViewOrder(selectedTable)}
                  >
                    Ver Cuenta
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    icon={<PlusIcon className="w-6 h-6" />}
                    onClick={() => handleOpenOrder(selectedTable)}
                  >
                    Agregar Items
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="success"
                      size="lg"
                      fullWidth
                      icon={<CurrencyDollarIcon className="w-5 h-5" />}
                      onClick={() => handleCharge(selectedTable)}
                    >
                      Cobrar
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      fullWidth
                      icon={<ArrowsRightLeftIcon className="w-5 h-5" />}
                      onClick={() => handleTransfer(selectedTable)}
                    >
                      Transferir
                    </Button>
                  </div>
                </>
              )}

              {selectedTable.status === 'RESERVED' && (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={<CheckCircleIcon className="w-6 h-6" />}
                    onClick={() => handleStatusChange(selectedTable, 'OCCUPIED')}
                  >
                    Sentar (Ocupar Mesa)
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    fullWidth
                    icon={<XMarkIcon className="w-6 h-6" />}
                    onClick={() => handleStatusChange(selectedTable, 'AVAILABLE')}
                  >
                    Cancelar Reserva
                  </Button>
                </>
              )}

              {selectedTable.status === 'CLEANING' && (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  icon={<CheckCircleIcon className="w-6 h-6" />}
                  onClick={() => handleStatusChange(selectedTable, 'AVAILABLE')}
                >
                  Marcar Disponible
                </Button>
              )}

              {selectedTable.status === 'BLOCKED' && (
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  icon={<LockOpenIcon className="w-6 h-6" />}
                  onClick={() => handleStatusChange(selectedTable, 'AVAILABLE')}
                >
                  Desbloquear
                </Button>
              )}
            </div>

            {/* Merged table info & split button */}
            {selectedTable.isMerged && selectedTable.mergedFrom && (
              <div className="pt-2 border-t border-purple-200">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-purple-700">Mesa Fusionada ({selectedTable.capacity}p)</span>
                  </div>
                  <p className="text-xs text-purple-500 mb-1">
                    Compuesta por {selectedTable.mergedFrom.length} mesas:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTable.mergedFrom.map((m) => (
                      <span key={m.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                        Mesa {m.number} ({m.capacity}p)
                      </span>
                    ))}
                  </div>
                </div>
                {selectedTable.status === 'OCCUPIED' ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-sm font-semibold text-red-600">🚫 No se puede separar</p>
                    <p className="text-xs text-red-500 mt-1">Primero cobra la cuenta para poder separar las mesas</p>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    icon={<ScissorsIcon className="w-5 h-5" />}
                    onClick={() => handleOpenSplit(selectedTable)}
                  >
                    Separar Mesas
                  </Button>
                )}
              </div>
            )}

            {/* Extra status changes */}
            {selectedTable.status === 'OCCUPIED' && (
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  icon={<SparklesIcon className="w-5 h-5" />}
                  onClick={() => handleStatusChange(selectedTable, 'CLEANING')}
                  className="text-gray-500"
                >
                  Enviar a Limpieza
                </Button>
              </div>
            )}

            {selectedTable.status === 'AVAILABLE' && (
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  icon={<LockClosedIcon className="w-5 h-5" />}
                  onClick={() => handleStatusChange(selectedTable, 'BLOCKED')}
                  className="text-gray-500"
                >
                  Bloquear Mesa
                </Button>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ---------- Bottom Sheet: Add Table (Edit Mode) ---------- */}
      <BottomSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Agregar Nueva Mesa"
      >
        <AddTableForm onAdd={handleAddTable} nextNumber={nextTableNumber} />
      </BottomSheet>

      {/* ---------- Bottom Sheet: Edit Table Properties (Edit Mode) ---------- */}
      <BottomSheet
        isOpen={showEditProps && !!editingTable}
        onClose={() => {
          setShowEditProps(false);
          setEditingTable(null);
        }}
        title="Editar Mesa"
      >
        {editingTable && (
          <EditTablePanel
            table={editingTable}
            onUpdate={(updates) => handleUpdateTableProps(editingTable.id, updates)}
            onDelete={() => handleDeleteTable(editingTable.id)}
            onClose={() => {
              setShowEditProps(false);
              setEditingTable(null);
            }}
          />
        )}
      </BottomSheet>

      {/* ---------- Bottom Sheet: FUSION - Select person count ---------- */}
      <BottomSheet
        isOpen={showFusionSheet && !!fusionSourceTable}
        onClose={() => {
          setShowFusionSheet(false);
          setFusionSourceTable(null);
          setFusionPreview([]);
        }}
        title={`Fusionar Mesa ${fusionSourceTable?.number || ''}`}
      >
        {fusionSourceTable && (
          <div className="space-y-5">
            {/* Current table info */}
            <div className="bg-maki-light rounded-xl p-3 flex items-center gap-3">
              <div className="w-12 h-12 bg-maki-green/20 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-maki-green">{fusionSourceTable.number}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-maki-dark">{fusionSourceTable.name}</p>
                <p className="text-xs text-gray-500">Capacidad actual: {fusionSourceTable.capacity} personas</p>
              </div>
            </div>

            {/* Person count selector */}
            <div>
              <p className="text-sm font-semibold text-maki-dark mb-3">¿Cuantas personas necesitas sentar?</p>
              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 8, 10, 12, 14, 16, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleFusionCountChange(count)}
                    className={cn(
                      'min-h-[56px] rounded-xl text-lg font-bold transition-all touch-manipulation flex flex-col items-center justify-center',
                      fusionPersonCount === count
                        ? 'bg-maki-gold text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                    )}
                  >
                    {count}
                    <span className="text-[10px] font-normal opacity-70">pers</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview: which tables will be merged */}
            {fusionPreview.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold text-green-700">
                    Se fusionaran {fusionPreview.length + 1} mesas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="text-xs bg-maki-gold/20 text-maki-gold px-2 py-1 rounded-full font-bold">
                    Mesa {fusionSourceTable.number} ({fusionSourceTable.capacity}p)
                  </span>
                  {fusionPreview.map((t) => (
                    <span key={t.id} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      + Mesa {t.number} ({t.capacity}p)
                    </span>
                  ))}
                </div>
                <p className="text-xs text-green-600 font-semibold">
                  Total: {fusionSourceTable.capacity + fusionPreview.reduce((s, t) => s + t.capacity, 0)} personas
                </p>
              </div>
            )}

            {fusionPreview.length === 0 && fusionPersonCount > fusionSourceTable.capacity && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-sm text-red-600 font-medium">
                  No hay suficientes mesas disponibles cerca para {fusionPersonCount} personas
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => {
                  setShowFusionSheet(false);
                  setFusionSourceTable(null);
                  setFusionPreview([]);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<LinkIcon className="w-5 h-5" />}
                onClick={handleExecuteFusion}
                disabled={fusionPreview.length === 0}
              >
                Fusionar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* ---------- Bottom Sheet: SPLIT - Select how many to detach ---------- */}
      <BottomSheet
        isOpen={showSplitSheet && !!splitSourceTable}
        onClose={() => {
          setShowSplitSheet(false);
          setSplitSourceTable(null);
        }}
        title={`Separar Mesa ${splitSourceTable?.number || ''}`}
      >
        {splitSourceTable && splitSourceTable.mergedFrom && (
          <div className="space-y-5">
            {/* Current merged info */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-bold text-purple-700">
                  Mesa fusionada: {splitSourceTable.capacity} personas
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {splitSourceTable.mergedFrom.map((m) => (
                  <span key={m.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    Mesa {m.number} ({m.capacity}p)
                  </span>
                ))}
              </div>
            </div>

            {/* How many to separate */}
            <div>
              <p className="text-sm font-semibold text-maki-dark mb-3">¿Cuantas mesas quieres separar?</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: splitSourceTable.mergedFrom.length }, (_, i) => i + 1).map((count) => {
                  const isAll = count === splitSourceTable.mergedFrom!.length;
                  return (
                    <button
                      key={count}
                      onClick={() => setSplitCount(count)}
                      className={cn(
                        'min-h-[56px] rounded-xl font-bold transition-all touch-manipulation flex flex-col items-center justify-center',
                        splitCount === count
                          ? 'bg-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                      )}
                    >
                      <span className="text-lg">{count}</span>
                      <span className="text-[10px] font-normal opacity-70">
                        {isAll ? 'TODAS' : count === 1 ? 'mesa' : 'mesas'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview what happens */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Resultado:</p>
              {splitCount >= splitSourceTable.mergedFrom.length ? (
                <p className="text-sm font-semibold text-gray-700">
                  Todas las mesas vuelven a ser individuales
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-700">
                  Se separan {splitCount} mesa(s) · Quedan {splitSourceTable.mergedFrom.length - splitCount} fusionada(s) ({splitSourceTable.mergedFrom.slice(0, splitSourceTable.mergedFrom.length - splitCount).reduce((s, m) => s + m.capacity, 0)}p)
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => {
                  setShowSplitSheet(false);
                  setSplitSourceTable(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<ScissorsIcon className="w-5 h-5" />}
                onClick={handleExecuteSplit}
              >
                Separar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
      {/* ---------- Bottom Sheet: VER CUENTA ---------- */}
      <BottomSheet
        isOpen={showBillSheet && !!billTable}
        onClose={() => {
          setShowBillSheet(false);
          setBillTable(null);
        }}
        title={`Cuenta · ${billTable?.name || 'Mesa'}`}
      >
        {billTable && (() => {
          const TAX_RATE = 0.07; // 7% ITBMS Panama

          if (billLoading) {
            return (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-maki-gold border-t-transparent rounded-full animate-spin" />
              </div>
            );
          }

          const order = billOrder;

          if (!order || !order.items || order.items.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg mb-2">Sin items en la cuenta</p>
                <p className="text-gray-300 text-sm">Agrega productos desde &quot;Agregar Items&quot;</p>
                {/* Debug info */}
                <div className="mt-4 text-left bg-gray-100 p-3 rounded-lg text-xs text-gray-500 space-y-1">
                  <p className="font-bold text-gray-700">Debug info:</p>
                  <p>billOrder: {order ? `Order #${order.orderNumber} (items: ${order.items?.length ?? 'undefined'})` : 'null'}</p>
                  <p>billTable.id: {billTable.id}</p>
                  <p>billTable.currentOrderId: {billTable.currentOrderId || 'none'}</p>
                  <p>billTable.status: {billTable.status}</p>
                  <p>storeTables count: {storeTables.length}</p>
                  <p>activeOrders count: {activeOrders.length}</p>
                  <p>token: {typeof window !== 'undefined' ? (localStorage.getItem('maki_token') || 'null')?.slice(0, 20) + '...' : 'ssr'}</p>
                  <p>Check browser console for [VER_CUENTA] logs</p>
                  <button
                    onClick={async () => {
                      console.log('[DEBUG] Manual retry...');
                      setBillLoading(true);
                      try {
                        // Direct API call to debug
                        const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/v1/orders/table/${billTable.id}`, {
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('maki_token')}`,
                            'X-Branch-Id': localStorage.getItem('maki_branch_id') || '',
                          }
                        });
                        const json = await resp.json();
                        console.log('[DEBUG] Direct fetch /orders/table/ response:', json);
                        const orders = json.data || json;
                        if (Array.isArray(orders) && orders.length > 0) {
                          console.log('[DEBUG] Found order! Setting billOrder...');
                          setBillOrder(orders[0] as import('@/types').Order);
                        } else {
                          console.log('[DEBUG] No orders found in response');
                        }
                      } catch (err) {
                        console.error('[DEBUG] Direct fetch error:', err);
                      }
                      setBillLoading(false);
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
                  >
                    🔄 Retry (direct API)
                  </button>
                </div>
              </div>
            );
          }

          // Calculate totals from items
          const itemsSubtotal = order.items.reduce((sum, item) => {
            return sum + (item.unitPrice * item.quantity);
          }, 0);
          const subtotal = itemsSubtotal > 0 ? itemsSubtotal : (order.subtotal || billTable.orderTotal || 0);
          const tax = subtotal * TAX_RATE;
          const total = subtotal + tax;

          return (
            <div className="space-y-4">
              {/* Table & Order info */}
              <div className="flex items-center justify-between bg-maki-light rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-maki-gold/20 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-maki-gold">{billTable.number}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-maki-dark">Orden #{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {billTable.serverName ? `Mesero: ${billTable.serverName}` : ''}
                      {billTable.occupiedAt && ` · ${formatElapsedTime(billTable.occupiedAt)}`}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  'text-xs font-bold px-2 py-1 rounded-full',
                  order.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                  order.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                )}>
                  {order.status === 'IN_PROGRESS' ? 'En Cocina' : order.status === 'OPEN' ? 'Abierta' : order.status}
                </span>
              </div>

              {/* Items list */}
              <div className="divide-y divide-gray-100">
                {order.items.map((item) => {
                  const itemTotal = item.unitPrice * item.quantity;
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    PENDING: { bg: 'bg-gray-100', text: 'text-gray-500', label: '⏳' },
                    PREPARING: { bg: 'bg-amber-100', text: 'text-amber-600', label: '🔥' },
                    READY: { bg: 'bg-green-100', text: 'text-green-600', label: '✅' },
                    DELIVERED: { bg: 'bg-blue-100', text: 'text-blue-600', label: '🍽' },
                    SERVED: { bg: 'bg-blue-100', text: 'text-blue-600', label: '🍽' },
                  };
                  const sc = statusConfig[item.status] || statusConfig.PENDING;
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs', sc.bg)}>
                          {sc.label}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-maki-dark truncate">
                            <span className="text-maki-gold font-bold mr-1">{item.quantity}x</span>
                            {item.name || (item as any).product?.name || item.productId}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-red-500 font-medium">** {item.notes}</p>
                          )}
                        </div>
                      </div>
                      {itemTotal > 0 && (
                        <span className="text-sm font-bold text-maki-dark ml-2">
                          {formatCurrency(itemTotal)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="bg-maki-light rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-maki-dark">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">ITBMS (7%)</span>
                  <span className="font-semibold text-maki-dark">{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-base font-bold text-maki-dark">Total</span>
                  <span className="text-xl font-black text-maki-gold">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <Button
                  variant="success"
                  size="lg"
                  fullWidth
                  icon={<CurrencyDollarIcon className="w-6 h-6" />}
                  onClick={() => {
                    const tableToCharge = { ...billTable!, currentOrderId: order.id || billTable!.currentOrderId };
                    setShowBillSheet(false);
                    setBillTable(null);
                    handleCharge(tableToCharge);
                  }}
                >
                  Cobrar {formatCurrency(total)}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon={<PlusIcon className="w-5 h-5" />}
                  onClick={() => {
                    setShowBillSheet(false);
                    setBillTable(null);
                    handleOpenOrder(billTable);
                  }}
                >
                  Agregar Más Items
                </Button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </MainLayout>
    </RequirePermission>
  );
}
