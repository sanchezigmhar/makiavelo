'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BuildingStorefrontIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  BellIcon,
  PaintBrushIcon,
  ClockIcon,
  ShieldCheckIcon,
  ServerStackIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import RequirePermission from '@/components/common/RequirePermission';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const settingSections: SettingSection[] = [
  { id: 'branch', title: 'Sucursal', description: 'Nombre, direccion, horarios', icon: BuildingStorefrontIcon, color: 'bg-maki-gold' },
  { id: 'receipt', title: 'Recibos', description: 'Impresion, encabezado, pie', icon: PrinterIcon, color: 'bg-blue-500' },
  { id: 'tax', title: 'Impuestos', description: 'ITBMS, tasas, moneda', icon: CurrencyDollarIcon, color: 'bg-emerald-500' },
  { id: 'notifications', title: 'Notificaciones', description: 'Alertas, sonidos, KDS', icon: BellIcon, color: 'bg-purple-500' },
  { id: 'appearance', title: 'Apariencia', description: 'Tema, colores, logo', icon: PaintBrushIcon, color: 'bg-pink-500' },
  { id: 'shifts', title: 'Turnos', description: 'Horarios, apertura de caja', icon: ClockIcon, color: 'bg-orange-500' },
  { id: 'security', title: 'Seguridad', description: 'PIN, sesiones, permisos', icon: ShieldCheckIcon, color: 'bg-red-500' },
  { id: 'system', title: 'Sistema', description: 'Backup, conexion, version', icon: ServerStackIcon, color: 'bg-gray-500' },
];

export default function ConfiguracionPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Toggle states for demo
  const [settings, setSettings] = useState({
    autoReceiptPrint: true,
    soundAlerts: true,
    kdsAutoRefresh: true,
    darkModeKds: true,
    requirePinForVoid: true,
    requirePinForDiscount: true,
    autoLogout: false,
    lowStockAlerts: true,
    reservationAlerts: true,
    orderReadyAlerts: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success('Configuracion actualizada');
  };

  return (
    <RequirePermission permission="settings">
    <MainLayout>
      <Header title="Configuracion" subtitle="Ajustes del sistema" />

      <div className="flex-1 overflow-hidden flex">
        {/* Left: Section list */}
        <div className="w-[320px] border-r border-gray-100 overflow-y-auto scrollbar-thin p-4">
          <div className="space-y-2">
            {settingSections.map((section) => (
              <motion.button
                key={section.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 rounded-xl text-left',
                  'transition-all duration-150 touch-manipulation',
                  activeSection === section.id
                    ? 'bg-maki-dark text-white shadow-card'
                    : 'bg-white text-maki-dark hover:bg-gray-50 shadow-sm'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  activeSection === section.id ? 'bg-white/20' : section.color
                )}>
                  <section.icon className={cn('w-5 h-5', activeSection === section.id ? 'text-white' : 'text-white')} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{section.title}</p>
                  <p className={cn('text-xs truncate', activeSection === section.id ? 'text-white/60' : 'text-maki-gray')}>
                    {section.description}
                  </p>
                </div>
                <ChevronRightIcon className={cn('w-4 h-4 flex-shrink-0', activeSection === section.id ? 'text-white/60' : 'text-gray-300')} />
              </motion.button>
            ))}
          </div>
        </div>

        {/* Right: Section content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {!activeSection ? (
            <div className="flex items-center justify-center h-full text-maki-gray">
              <div className="text-center">
                <BuildingStorefrontIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-touch-lg">Selecciona una seccion</p>
                <p className="text-sm mt-1">Toca una opcion del menu izquierdo</p>
              </div>
            </div>
          ) : activeSection === 'branch' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Datos de la Sucursal</h2>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Nombre</label>
                  <p className="text-touch-base font-semibold text-maki-dark">Makiavelo - Panama City</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Direccion</label>
                  <p className="text-touch-base font-semibold text-maki-dark">Calle 50, Torre Global Bank, PB</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Telefono</label>
                  <p className="text-touch-base font-semibold text-maki-dark">+507 265-1234</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">RUC</label>
                  <p className="text-touch-base font-semibold text-maki-dark">155-123-456789</p>
                </div>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Guardar Cambios
              </Button>
            </motion.div>
          ) : activeSection === 'notifications' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Notificaciones</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Sonidos de alerta</p>
                    <p className="text-sm text-maki-gray">Sonar al recibir nuevas ordenes</p>
                  </div>
                  <Toggle checked={settings.soundAlerts} onChange={() => toggleSetting('soundAlerts')} />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Stock bajo</p>
                    <p className="text-sm text-maki-gray">Alerta cuando inventario baja del minimo</p>
                  </div>
                  <Toggle checked={settings.lowStockAlerts} onChange={() => toggleSetting('lowStockAlerts')} />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Reservaciones</p>
                    <p className="text-sm text-maki-gray">Notificar nuevas reservaciones</p>
                  </div>
                  <Toggle checked={settings.reservationAlerts} onChange={() => toggleSetting('reservationAlerts')} />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Ordenes listas</p>
                    <p className="text-sm text-maki-gray">Alertar cuando una orden esta lista</p>
                  </div>
                  <Toggle checked={settings.orderReadyAlerts} onChange={() => toggleSetting('orderReadyAlerts')} />
                </div>
              </div>
            </motion.div>
          ) : activeSection === 'receipt' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Configuracion de Recibos</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Imprimir automaticamente</p>
                    <p className="text-sm text-maki-gray">Imprimir recibo al cerrar orden</p>
                  </div>
                  <Toggle checked={settings.autoReceiptPrint} onChange={() => toggleSetting('autoReceiptPrint')} />
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Encabezado del recibo</label>
                  <p className="text-touch-base font-semibold text-maki-dark mt-1">Makiavelo Sushi & Japanese Cuisine</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Pie del recibo</label>
                  <p className="text-touch-base font-semibold text-maki-dark mt-1">Gracias por su visita. Nos vemos pronto!</p>
                </div>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Guardar Cambios
              </Button>
            </motion.div>
          ) : activeSection === 'tax' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Impuestos y Moneda</h2>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Moneda</label>
                  <p className="text-touch-base font-semibold text-maki-dark">USD - Dolar Americano</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">ITBMS</label>
                  <p className="text-touch-base font-semibold text-maki-dark">7%</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Propina sugerida</label>
                  <p className="text-touch-base font-semibold text-maki-dark">10%</p>
                </div>
              </div>
              <Button variant="primary" size="lg" fullWidth>
                Guardar Cambios
              </Button>
            </motion.div>
          ) : activeSection === 'security' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Seguridad</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">PIN para anular items</p>
                    <p className="text-sm text-maki-gray">Requerir PIN de gerente para anulaciones</p>
                  </div>
                  <Toggle checked={settings.requirePinForVoid} onChange={() => toggleSetting('requirePinForVoid')} />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">PIN para descuentos</p>
                    <p className="text-sm text-maki-gray">Requerir PIN para aplicar descuentos</p>
                  </div>
                  <Toggle checked={settings.requirePinForDiscount} onChange={() => toggleSetting('requirePinForDiscount')} />
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div>
                    <p className="font-semibold text-maki-dark">Cierre automatico de sesion</p>
                    <p className="text-sm text-maki-gray">Cerrar sesion despues de inactividad</p>
                  </div>
                  <Toggle checked={settings.autoLogout} onChange={() => toggleSetting('autoLogout')} />
                </div>
              </div>
            </motion.div>
          ) : activeSection === 'system' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">Sistema</h2>
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Version</label>
                  <p className="text-touch-base font-semibold text-maki-dark">MakiCore v1.0.0</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">API URL</label>
                  <p className="text-touch-base font-semibold text-maki-dark">http://localhost:4001</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <label className="text-sm text-maki-gray">Socket</label>
                  <p className="text-touch-base font-semibold text-emerald-600">Conectado</p>
                </div>
              </div>
              <div className="space-y-2 pt-4">
                <Button variant="outline" size="lg" fullWidth>
                  Crear Backup
                </Button>
                <Button variant="ghost" size="lg" fullWidth className="text-red-500">
                  Limpiar Cache
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-lg">
              <h2 className="text-touch-xl font-bold text-maki-dark">
                {settingSections.find((s) => s.id === activeSection)?.title}
              </h2>
              <p className="text-maki-gray">Configuracion en desarrollo.</p>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-semibold text-maki-dark">KDS auto-refresh</p>
                  <p className="text-sm text-maki-gray">Refrescar pantalla automaticamente</p>
                </div>
                <Toggle checked={settings.kdsAutoRefresh} onChange={() => toggleSetting('kdsAutoRefresh')} />
              </div>
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div>
                  <p className="font-semibold text-maki-dark">Modo oscuro KDS</p>
                  <p className="text-sm text-maki-gray">Fondo oscuro para pantalla cocina</p>
                </div>
                <Toggle checked={settings.darkModeKds} onChange={() => toggleSetting('darkModeKds')} />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </MainLayout>
    </RequirePermission>
  );
}
