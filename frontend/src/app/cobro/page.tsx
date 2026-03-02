'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ArrowsRightLeftIcon,
  ReceiptPercentIcon,
  PrinterIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import MainLayout from '@/components/layout/MainLayout';
import Header from '@/components/layout/Header';
import NumPad, { QuickAmounts } from '@/components/ui/NumPad';
import RequirePermission from '@/components/common/RequirePermission';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useOrdersStore } from '@/store/orders.store';
import { useTablesStore } from '@/store/tables.store';
import { cn, formatCurrency } from '@/lib/utils';
import type { Order, PaymentMethod } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { id: 'CASH', label: 'Efectivo', icon: BanknotesIcon, color: 'bg-emerald-500' },
  { id: 'CARD', label: 'Tarjeta', icon: CreditCardIcon, color: 'bg-blue-500' },
  { id: 'YAPPY', label: 'Yappy', icon: DevicePhoneMobileIcon, color: 'bg-purple-500' },
  { id: 'TRANSFER', label: 'Transferencia', icon: ArrowsRightLeftIcon, color: 'bg-orange-500' },
];

const tipOptions = [
  { value: 0, label: '0%' },
  { value: 10, label: '10%' },
  { value: 15, label: '15%' },
  { value: 20, label: '20%' },
];

export default function CobroPageWrapper() {
  return (
    <RequirePermission permission="payments">
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-maki-gold border-t-transparent rounded-full animate-spin" /></div>}>
      <CobroPage />
    </Suspense>
    </RequirePermission>
  );
}

function CobroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrders, fetchActiveOrders, updateOrderStatus, currentOrder, fetchOrder } = useOrdersStore();
  const { updateTableStatus } = useTablesStore();

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [cashAmount, setCashAmount] = useState('');
  const [tipPercent, setTipPercent] = useState(10);
  const [customTip, setCustomTip] = useState('');
  const [useCustomTip, setUseCustomTip] = useState(false);
  const [printReceipt, setPrintReceipt] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitCount, setSplitCount] = useState(2);

  // Demo order
  const demoOrder: Order = useMemo(() => ({
    id: 'demo-1',
    orderNumber: '147',
    type: 'DINE_IN',
    status: 'DELIVERED',
    tableId: 'table-5',
    table: { id: 'table-5', number: 5, name: 'Mesa 5', zoneId: 'salon', capacity: 4, status: 'OCCUPIED', isActive: true },
    userId: '1',
    branchId: '1',
    items: [
      { id: 'i1', orderId: 'demo-1', productId: 'p1', name: 'Dragon Roll', quantity: 2, unitPrice: 18.50, totalPrice: 37.00, courseType: 'PLATO_FUERTE', status: 'DELIVERED', sortOrder: 1 },
      { id: 'i2', orderId: 'demo-1', productId: 'p7', name: 'Edamame', quantity: 1, unitPrice: 8.00, totalPrice: 8.00, courseType: 'ENTRADA', status: 'DELIVERED', sortOrder: 2 },
      { id: 'i3', orderId: 'demo-1', productId: 'p10', name: 'Miso Soup', quantity: 2, unitPrice: 6.50, totalPrice: 13.00, courseType: 'ENTRADA', status: 'DELIVERED', sortOrder: 3 },
      { id: 'i4', orderId: 'demo-1', productId: 'p17', name: 'Asahi Beer', quantity: 3, unitPrice: 6.00, totalPrice: 18.00, courseType: 'BEBIDA', status: 'DELIVERED', sortOrder: 4 },
      { id: 'i5', orderId: 'demo-1', productId: 'p14', name: 'Mochi Ice Cream', quantity: 2, unitPrice: 9.00, totalPrice: 18.00, courseType: 'POSTRE', status: 'DELIVERED', sortOrder: 5 },
    ],
    subtotal: 94.00,
    taxAmount: 6.58,
    discountAmount: 0,
    tipAmount: 0,
    total: 100.58,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  }), []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchActiveOrders();
      const orderId = searchParams?.get('orderId');
      const tableId = searchParams?.get('tableId');
      console.log('[COBRO] Loading order: orderId=', orderId, 'tableId=', tableId);

      let foundOrder: Order | null = null;

      // Strategy 1: Direct order ID
      if (orderId) {
        foundOrder = await fetchOrder(orderId);
        console.log('[COBRO] Strategy 1 (fetchOrder):', foundOrder ? `#${foundOrder.orderNumber}` : 'null');
      }

      // Strategy 2: Fetch by table from backend
      if (!foundOrder && tableId) {
        try {
          const { data } = await api.get<Order[]>(`/orders/table/${tableId}`);
          const orders = Array.isArray(data) ? data : [];
          if (orders.length > 0) {
            foundOrder = orders[0];
            console.log('[COBRO] Strategy 2 (API table):', `#${foundOrder.orderNumber}`);
          }
        } catch {
          console.log('[COBRO] Strategy 2 failed (API error)');
        }
      }

      // Strategy 3: Check activeOrders in memory
      if (!foundOrder && tableId) {
        const { activeOrders: allActive } = useOrdersStore.getState();
        const memOrder = allActive.find((o) => o.tableId === tableId);
        if (memOrder) {
          foundOrder = memOrder;
          console.log('[COBRO] Strategy 3 (activeOrders memory):', `#${foundOrder.orderNumber}`);
        }
      }

      // Strategy 4: Check storeTables for embedded order data (demo mode)
      if (!foundOrder && tableId) {
        const { tables } = useTablesStore.getState();
        const storeTable = tables.find((t) => t.id === tableId) as any; // eslint-disable-line
        if (storeTable?.currentOrder) {
          const co = storeTable.currentOrder;
          foundOrder = {
            ...co,
            tableId,
            table: { id: tableId, number: storeTable.number, name: storeTable.name, zoneId: storeTable.zoneId, capacity: storeTable.capacity, status: storeTable.status, isActive: true },
          };
          console.log('[COBRO] Strategy 4 (storeTables):', `#${foundOrder!.orderNumber} items=${foundOrder!.items?.length}`);
        }
      }

      if (foundOrder) {
        setSelectedOrder(foundOrder);
      } else {
        console.log('[COBRO] No order found, will use demo fallback');
      }
      setIsLoading(false);
    };
    load();
  }, [fetchActiveOrders, fetchOrder, searchParams]);

  const order = selectedOrder || demoOrder;
  const tipAmount = useCustomTip
    ? parseFloat(customTip || '0')
    : (order.subtotal * tipPercent) / 100;
  const totalWithTip = order.total + tipAmount;
  const cashValue = parseFloat(cashAmount || '0');
  const change = selectedMethod === 'CASH' ? Math.max(0, cashValue - totalWithTip) : 0;
  const canProcess =
    selectedMethod !== 'CASH' || cashValue >= totalWithTip;

  // Resolve tableId — prefer URL param (it's the actual table the user clicked)
  const resolvedTableId = searchParams?.get('tableId') || order.tableId || null;

  // Clean up localStorage entries for a table after payment
  const cleanupTableStorage = (tId: string | null) => {
    if (!tId) return;
    try {
      // Clean makiavelo-table-orders
      const tableOrders = JSON.parse(localStorage.getItem('makiavelo-table-orders') || '{}');
      if (tableOrders[tId]) {
        delete tableOrders[tId];
        localStorage.setItem('makiavelo-table-orders', JSON.stringify(tableOrders));
      }
      // Clean makiavelo-merged-table-orders
      const mergedOrders = JSON.parse(localStorage.getItem('makiavelo-merged-table-orders') || '{}');
      if (mergedOrders[tId]) {
        delete mergedOrders[tId];
        localStorage.setItem('makiavelo-merged-table-orders', JSON.stringify(mergedOrders));
      }
    } catch { /* ignore */ }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    // Map frontend payment method to backend enum
    const backendMethodMap: Record<string, string> = {
      'CASH': 'CASH',
      'CARD': 'CREDIT_CARD',
      'YAPPY': 'TRANSFER',  // Yappy maps to transfer in backend
      'TRANSFER': 'TRANSFER',
      'OTHER': 'OTHER',
    };
    const backendMethod = backendMethodMap[selectedMethod] || selectedMethod;

    try {
      console.log('[COBRO] Processing payment:', { orderId: order.id, method: backendMethod, amount: totalWithTip, tip: tipAmount, tableId: resolvedTableId });
      await api.post(`/payments`, {
        orderId: order.id,
        method: backendMethod,
        amount: totalWithTip,
        tip: tipAmount,
        reference: selectedMethod !== 'CASH' ? `${selectedMethod}-${Date.now()}` : undefined,
      });
      console.log('[COBRO] Payment API succeeded');
      // The backend auto-closes the order and sets table to CLEANING when fully paid
      // But also explicitly update the table to AVAILABLE
      if (resolvedTableId) {
        try { await updateTableStatus(resolvedTableId, 'AVAILABLE'); } catch { /* backend might have set it to CLEANING */ }
      }
      cleanupTableStorage(resolvedTableId);
      toast.success('Pago procesado');
      setShowSuccess(true);
    } catch (err) {
      console.log('[COBRO] Payment API failed (demo mode):', err);
      // Demo mode - close order and release table locally
      await updateOrderStatus(order.id, 'CLOSED');
      if (resolvedTableId) {
        await updateTableStatus(resolvedTableId, 'AVAILABLE');
      }
      cleanupTableStorage(resolvedTableId);
      toast.success('Pago procesado');
      setShowSuccess(true);
    }
    setIsProcessing(false);
  };

  const handleDone = () => {
    setShowSuccess(false);
    setSelectedOrder(null);
    setCashAmount('');
    setTipPercent(10);
    setUseCustomTip(false);
    router.push('/mesas');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Header title="Cobro" />
        <PageLoader message="Cargando..." />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Cobro"
        subtitle={order.table ? `Mesa ${order.table.number} - Orden #${order.orderNumber}` : `Orden #${order.orderNumber}`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeftIcon className="w-5 h-5" />}
            onClick={() => router.back()}
          >
            Volver
          </Button>
        }
      />

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Order summary + tip */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {/* Order Items */}
          <Card className="mb-4">
            <h3 className="text-touch-lg font-bold text-maki-dark mb-3">Resumen de Orden</h3>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-maki-gold font-bold text-sm w-6">{item.quantity}x</span>
                    <span className="text-maki-dark font-medium">{item.name}</span>
                  </div>
                  <span className="text-maki-dark font-semibold">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-maki-gray">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-maki-gray">
                <span>ITBMS (7%)</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-maki-gold font-semibold">
                <span>Propina</span>
                <span>{formatCurrency(tipAmount)}</span>
              </div>
              <div className="flex justify-between text-touch-xl font-bold text-maki-dark pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{formatCurrency(totalWithTip)}</span>
              </div>
            </div>
          </Card>

          {/* Tip selector */}
          <Card className="mb-4">
            <h3 className="text-touch-base font-bold text-maki-dark mb-3">
              <ReceiptPercentIcon className="w-5 h-5 inline mr-1" />
              Propina
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {tipOptions.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setTipPercent(opt.value); setUseCustomTip(false); }}
                  className={cn(
                    'min-h-[52px] rounded-xl font-bold text-touch-base transition-all touch-manipulation',
                    !useCustomTip && tipPercent === opt.value
                      ? 'bg-maki-gold text-white shadow-sm'
                      : 'bg-maki-light text-maki-dark hover:bg-maki-cream'
                  )}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setUseCustomTip(true)}
              className={cn(
                'w-full min-h-[48px] rounded-xl text-sm font-medium transition-all touch-manipulation',
                useCustomTip
                  ? 'bg-maki-gold/10 text-maki-gold border border-maki-gold'
                  : 'bg-gray-50 text-maki-gray hover:bg-gray-100'
              )}
            >
              Propina personalizada
            </motion.button>
            {useCustomTip && (
              <div className="mt-3">
                <NumPad
                  value={customTip}
                  onChange={setCustomTip}
                  label="Monto de propina"
                  showCurrency
                />
              </div>
            )}
          </Card>

          {/* Split bill */}
          <Card className="mb-4">
            <button
              onClick={() => setShowSplitBill(!showSplitBill)}
              className="w-full flex items-center justify-between min-h-[48px] touch-manipulation"
            >
              <span className="flex items-center gap-2 font-bold text-maki-dark">
                <UserGroupIcon className="w-5 h-5" />
                Dividir Cuenta
              </span>
              <span className="text-maki-gray text-sm">{showSplitBill ? 'Ocultar' : 'Expandir'}</span>
            </button>
            {showSplitBill && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-center gap-4 mb-3">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <motion.button
                      key={n}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSplitCount(n)}
                      className={cn(
                        'w-14 h-14 rounded-xl font-bold text-touch-lg transition-all touch-manipulation',
                        splitCount === n
                          ? 'bg-maki-dark text-white'
                          : 'bg-gray-100 text-maki-gray hover:bg-gray-200'
                      )}
                    >
                      {n}
                    </motion.button>
                  ))}
                </div>
                <div className="text-center p-3 bg-maki-light rounded-xl">
                  <p className="text-sm text-maki-gray">Cada persona paga</p>
                  <p className="text-touch-2xl font-bold text-maki-dark">
                    {formatCurrency(totalWithTip / splitCount)}
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Print receipt toggle */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-card">
            <span className="flex items-center gap-2 font-medium text-maki-dark">
              <PrinterIcon className="w-5 h-5" />
              Imprimir recibo
            </span>
            <Toggle
              checked={printReceipt}
              onChange={setPrintReceipt}
            />
          </div>
        </div>

        {/* RIGHT: Payment method + NumPad */}
        <div className="w-[420px] bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
          <div className="p-6 flex-1">
            {/* Payment methods */}
            <h3 className="text-touch-base font-bold text-maki-dark mb-3">Metodo de Pago</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {paymentMethods.map((method) => (
                <motion.button
                  key={method.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setSelectedMethod(method.id); setCashAmount(''); }}
                  className={cn(
                    'min-h-[72px] rounded-2xl flex flex-col items-center justify-center gap-2',
                    'transition-all duration-150 touch-manipulation border-2',
                    selectedMethod === method.id
                      ? 'border-maki-gold bg-maki-gold/5 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', method.color)}>
                    <method.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={cn(
                    'text-sm font-semibold',
                    selectedMethod === method.id ? 'text-maki-gold' : 'text-maki-gray'
                  )}>
                    {method.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Cash NumPad */}
            {selectedMethod === 'CASH' && (
              <div>
                <h3 className="text-touch-base font-bold text-maki-dark mb-3">Monto Recibido</h3>
                <QuickAmounts
                  amounts={[20, 50, 100, totalWithTip]}
                  onSelect={(amount) => setCashAmount(amount.toString())}
                  className="mb-4"
                />
                <NumPad
                  value={cashAmount}
                  onChange={setCashAmount}
                  showCurrency
                />

                {/* Change display */}
                {cashValue > 0 && (
                  <div className={cn(
                    'mt-4 p-4 rounded-2xl text-center',
                    cashValue >= totalWithTip ? 'bg-emerald-50' : 'bg-red-50'
                  )}>
                    <p className="text-sm text-maki-gray">Cambio</p>
                    <p className={cn(
                      'text-touch-3xl font-bold',
                      cashValue >= totalWithTip ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {cashValue >= totalWithTip
                        ? formatCurrency(change)
                        : `Faltan ${formatCurrency(totalWithTip - cashValue)}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Non-cash confirmation */}
            {selectedMethod !== 'CASH' && (
              <div className="text-center p-6 bg-maki-light rounded-2xl">
                <p className="text-sm text-maki-gray mb-2">Total a cobrar</p>
                <p className="text-touch-3xl font-bold text-maki-dark">
                  {formatCurrency(totalWithTip)}
                </p>
                <p className="text-sm text-maki-gray mt-2">
                  {selectedMethod === 'CARD' && 'Pasa la tarjeta por el terminal'}
                  {selectedMethod === 'YAPPY' && 'El cliente debe confirmar en Yappy'}
                  {selectedMethod === 'TRANSFER' && 'Verifica la transferencia recibida'}
                </p>
              </div>
            )}
          </div>

          {/* Process button */}
          <div className="p-6 border-t border-gray-100">
            <Button
              variant="success"
              size="xl"
              fullWidth
              loading={isProcessing}
              disabled={!canProcess}
              onClick={handleProcessPayment}
              icon={<CheckCircleIcon className="w-6 h-6" />}
            >
              Cobrar {formatCurrency(totalWithTip)}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccess}
        onClose={handleDone}
        showClose={false}
        closeOnOverlay={false}
        size="sm"
      >
        <div className="text-center py-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircleIcon className="w-14 h-14 text-emerald-600" />
          </motion.div>
          <h2 className="text-touch-2xl font-bold text-maki-dark mb-2">
            Pago Exitoso
          </h2>
          <p className="text-maki-gray mb-1">
            Orden #{order.orderNumber} cobrada
          </p>
          <p className="text-touch-xl font-bold text-emerald-600 mb-1">
            {formatCurrency(totalWithTip)}
          </p>
          {selectedMethod === 'CASH' && change > 0 && (
            <p className="text-touch-lg font-semibold text-maki-gold">
              Cambio: {formatCurrency(change)}
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleDone}
            className="mt-6"
          >
            Listo
          </Button>
        </div>
      </Modal>
    </MainLayout>
  );
}
