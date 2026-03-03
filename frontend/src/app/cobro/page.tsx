'use client';

import React, { useEffect, useState, useMemo, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  DocumentTextIcon,
  BuildingLibraryIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
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

// ============================================================
// DGI Electronic Invoice types
// ============================================================
interface DgiResponse {
  success: boolean;
  invoice: { id: string; invoiceNumber: string; status: string; issuedAt: string };
  dgi: {
    cufe: string; authorizationNumber: string; authorizationDate: string;
    qrCodeUrl: string; protocolNumber: string; environment: string;
    xmlSigned: boolean; receivedAt: string;
  };
  emitter: { ruc: string; dv: string; businessName: string; tradeName: string; address: string; phone: string; email: string; activityCode: string; activityDescription: string };
  receiver: { ruc: string; businessName: string; type: string };
  document: { type: string; typeCode: string; branch: string; terminal: string; number: string; issueDate: string; dueDate: string; currency: string };
  totals: { subtotal: number; taxableAmount: number; taxExemptAmount: number; itbms: number; itbmsRate: number; discount: number; total: number; totalInWords: string };
  items: { lineNumber: number; description: string; quantity: number; unitPrice: number; subtotal: number; taxRate: number; taxAmount: number; total: number }[];
}

type DgiStep = 'idle' | 'connecting' | 'signing' | 'sending' | 'processing' | 'authorized' | 'error';

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
  const { fetchActiveOrders, updateOrderStatus, fetchOrder } = useOrdersStore();
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

  // DGI Factura Electronica state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [dgiStep, setDgiStep] = useState<DgiStep>('idle');
  const [dgiResponse, setDgiResponse] = useState<DgiResponse | null>(null);
  const [invoiceRuc, setInvoiceRuc] = useState('');
  const [invoiceBusinessName, setInvoiceBusinessName] = useState('');
  const [invoiceType, setInvoiceType] = useState<'consumidor_final' | 'contribuyente'>('consumidor_final');

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

      let foundOrder: Order | null = null;

      if (orderId) foundOrder = await fetchOrder(orderId);

      if (!foundOrder && tableId) {
        try {
          const { data } = await api.get<Order[]>(`/orders/table/${tableId}`);
          const orders = Array.isArray(data) ? data : [];
          if (orders.length > 0) foundOrder = orders[0];
        } catch { /* demo */ }
      }

      if (!foundOrder && tableId) {
        const { activeOrders: allActive } = useOrdersStore.getState();
        const memOrder = allActive.find((o) => o.tableId === tableId);
        if (memOrder) foundOrder = memOrder;
      }

      if (!foundOrder && tableId) {
        const { tables } = useTablesStore.getState();
        const storeTable = tables.find((t) => t.id === tableId) as any; // eslint-disable-line
        if (storeTable?.currentOrder) {
          const co = storeTable.currentOrder;
          foundOrder = { ...co, tableId, table: { id: tableId, number: storeTable.number, name: storeTable.name, zoneId: storeTable.zoneId, capacity: storeTable.capacity, status: storeTable.status, isActive: true } };
        }
      }

      if (foundOrder) setSelectedOrder(foundOrder);
      setIsLoading(false);
    };
    load();
  }, [fetchActiveOrders, fetchOrder, searchParams]);

  const order = selectedOrder || demoOrder;
  const tipAmount = useCustomTip ? parseFloat(customTip || '0') : (order.subtotal * tipPercent) / 100;
  const totalWithTip = order.total + tipAmount;
  const cashValue = parseFloat(cashAmount || '0');
  const change = selectedMethod === 'CASH' ? Math.max(0, cashValue - totalWithTip) : 0;
  const canProcess = selectedMethod !== 'CASH' || cashValue >= totalWithTip;
  const resolvedTableId = searchParams?.get('tableId') || order.tableId || null;

  const cleanupTableStorage = (tId: string | null) => {
    if (!tId) return;
    try {
      const tableOrders = JSON.parse(localStorage.getItem('makiavelo-table-orders') || '{}');
      if (tableOrders[tId]) { delete tableOrders[tId]; localStorage.setItem('makiavelo-table-orders', JSON.stringify(tableOrders)); }
      const mergedOrders = JSON.parse(localStorage.getItem('makiavelo-merged-table-orders') || '{}');
      if (mergedOrders[tId]) { delete mergedOrders[tId]; localStorage.setItem('makiavelo-merged-table-orders', JSON.stringify(mergedOrders)); }
    } catch { /* ignore */ }
  };

  const handleProcessPayment = async () => {
    setIsProcessing(true);
    const backendMethodMap: Record<string, string> = { 'CASH': 'CASH', 'CARD': 'CREDIT_CARD', 'YAPPY': 'TRANSFER', 'TRANSFER': 'TRANSFER', 'OTHER': 'OTHER' };
    const backendMethod = backendMethodMap[selectedMethod] || selectedMethod;

    try {
      await api.post(`/payments`, { orderId: order.id, method: backendMethod, amount: totalWithTip, tip: tipAmount, reference: selectedMethod !== 'CASH' ? `${selectedMethod}-${Date.now()}` : undefined });
      if (resolvedTableId) { try { await updateTableStatus(resolvedTableId, 'AVAILABLE'); } catch { /* */ } }
      cleanupTableStorage(resolvedTableId);
    } catch {
      await updateOrderStatus(order.id, 'CLOSED');
      if (resolvedTableId) await updateTableStatus(resolvedTableId, 'AVAILABLE');
      cleanupTableStorage(resolvedTableId);
    }

    setIsProcessing(false);
    setShowInvoiceModal(true);
  };

  // ============================================================
  // DGI Electronic Invoice Flow
  // ============================================================
  const handleGenerateInvoice = useCallback(async () => {
    setDgiStep('connecting');
    await new Promise((r) => setTimeout(r, 800));
    setDgiStep('signing');
    await new Promise((r) => setTimeout(r, 1000));
    setDgiStep('sending');

    try {
      const { data } = await api.post<DgiResponse>('/invoices/dgi', {
        orderId: order.id,
        taxId: invoiceType === 'contribuyente' ? invoiceRuc : undefined,
        businessName: invoiceType === 'contribuyente' ? invoiceBusinessName : undefined,
      });
      setDgiStep('processing');
      await new Promise((r) => setTimeout(r, 600));
      setDgiResponse(data);
      setDgiStep('authorized');
      toast.success('Factura autorizada por DGI', { icon: '✅', duration: 3000 });
    } catch {
      // Demo fallback
      setDgiStep('processing');
      await new Promise((r) => setTimeout(r, 600));
      const now = new Date();
      const mockCufe = `${Math.random().toString(16).slice(2, 10).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 14).toUpperCase()}`;
      const mockResponse: DgiResponse = {
        success: true,
        invoice: { id: 'demo-inv', invoiceNumber: `FAC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-000001`, status: 'AUTHORIZED', issuedAt: now.toISOString() },
        dgi: { cufe: mockCufe, authorizationNumber: `DGI-${now.getFullYear()}-${String(Math.floor(Math.random()*999999)).padStart(6,'0')}`, authorizationDate: now.toISOString(), qrCodeUrl: `https://dgi.mef.gob.pa/verificar?cufe=${mockCufe}`, protocolNumber: `PROT-${String(Math.floor(Math.random()*99999)).padStart(5,'0')}`, environment: 'DEMO', xmlSigned: true, receivedAt: now.toISOString() },
        emitter: { ruc: '155123456-2-2024', dv: '78', businessName: 'MAKIAVELO RESTAURANTE, S.A.', tradeName: 'Makiavelo', address: 'Av. Principal #123, Zona Gastronomica', phone: '+507 6234-5678', email: 'facturacion@makiavelo.com', activityCode: '5610', activityDescription: 'Restaurantes y servicios de comida' },
        receiver: { ruc: invoiceType === 'contribuyente' ? (invoiceRuc || 'SIN RUC') : 'CONSUMIDOR FINAL', businessName: invoiceType === 'contribuyente' ? (invoiceBusinessName || 'SIN NOMBRE') : 'Consumidor Final', type: invoiceType === 'contribuyente' ? 'CONTRIBUYENTE' : 'CONSUMIDOR_FINAL' },
        document: { type: 'FACTURA', typeCode: '01', branch: '001', terminal: '001', number: `FAC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-000001`, issueDate: now.toISOString(), dueDate: now.toISOString(), currency: 'USD' },
        totals: { subtotal: order.subtotal, taxableAmount: order.subtotal, taxExemptAmount: 0, itbms: order.taxAmount, itbmsRate: 0.07, discount: order.discountAmount, total: order.total, totalInWords: `${Math.floor(order.total)} DOLARES CON ${String(Math.round((order.total % 1) * 100)).padStart(2,'0')}/100` },
        items: order.items.map((item, idx) => ({ lineNumber: idx+1, description: item.name, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.totalPrice, taxRate: 0.07, taxAmount: +(item.totalPrice * 0.07).toFixed(2), total: +(item.totalPrice * 1.07).toFixed(2) })),
      };
      setDgiResponse(mockResponse);
      setDgiStep('authorized');
      toast.success('Factura autorizada por DGI (Demo)', { icon: '✅', duration: 3000 });
    }
  }, [order, invoiceType, invoiceRuc, invoiceBusinessName]);

  const handleSkipInvoice = () => { setShowInvoiceModal(false); setShowSuccess(true); };

  const handleDone = () => {
    setShowSuccess(false); setShowInvoiceModal(false); setSelectedOrder(null);
    setCashAmount(''); setTipPercent(10); setUseCustomTip(false);
    setDgiStep('idle'); setDgiResponse(null);
    router.push('/mesas');
  };

  if (isLoading) return <MainLayout><Header title="Cobro" /><PageLoader message="Cargando..." /></MainLayout>;

  return (
    <MainLayout>
      <Header
        title="Cobro"
        subtitle={order.table ? `Mesa ${order.table.number} - Orden #${order.orderNumber}` : `Orden #${order.orderNumber}`}
        actions={<Button variant="ghost" size="sm" icon={<ArrowLeftIcon className="w-5 h-5" />} onClick={() => router.back()}>Volver</Button>}
      />

      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Order summary + tip */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
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
              <div className="flex justify-between text-sm text-maki-gray"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between text-sm text-maki-gray"><span>ITBMS (7%)</span><span>{formatCurrency(order.taxAmount)}</span></div>
              {order.discountAmount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Descuento</span><span>-{formatCurrency(order.discountAmount)}</span></div>}
              <div className="flex justify-between text-sm text-maki-gold font-semibold"><span>Propina</span><span>{formatCurrency(tipAmount)}</span></div>
              <div className="flex justify-between text-touch-xl font-bold text-maki-dark pt-2 border-t border-gray-100"><span>Total</span><span>{formatCurrency(totalWithTip)}</span></div>
            </div>
          </Card>

          {/* Tip selector */}
          <Card className="mb-4">
            <h3 className="text-touch-base font-bold text-maki-dark mb-3"><ReceiptPercentIcon className="w-5 h-5 inline mr-1" />Propina</h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {tipOptions.map((opt) => (
                <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => { setTipPercent(opt.value); setUseCustomTip(false); }}
                  className={cn('min-h-[52px] rounded-xl font-bold text-touch-base transition-all touch-manipulation',
                    !useCustomTip && tipPercent === opt.value ? 'bg-maki-gold text-white shadow-sm' : 'bg-maki-light text-maki-dark hover:bg-maki-cream')}>
                  {opt.label}
                </motion.button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setUseCustomTip(true)}
              className={cn('w-full min-h-[48px] rounded-xl text-sm font-medium transition-all touch-manipulation',
                useCustomTip ? 'bg-maki-gold/10 text-maki-gold border border-maki-gold' : 'bg-gray-50 text-maki-gray hover:bg-gray-100')}>
              Propina personalizada
            </motion.button>
            {useCustomTip && <div className="mt-3"><NumPad value={customTip} onChange={setCustomTip} label="Monto de propina" showCurrency /></div>}
          </Card>

          {/* Split bill */}
          <Card className="mb-4">
            <button onClick={() => setShowSplitBill(!showSplitBill)} className="w-full flex items-center justify-between min-h-[48px] touch-manipulation">
              <span className="flex items-center gap-2 font-bold text-maki-dark"><UserGroupIcon className="w-5 h-5" />Dividir Cuenta</span>
              <span className="text-maki-gray text-sm">{showSplitBill ? 'Ocultar' : 'Expandir'}</span>
            </button>
            {showSplitBill && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-center gap-4 mb-3">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <motion.button key={n} whileTap={{ scale: 0.9 }} onClick={() => setSplitCount(n)}
                      className={cn('w-14 h-14 rounded-xl font-bold text-touch-lg transition-all touch-manipulation', splitCount === n ? 'bg-maki-dark text-white' : 'bg-gray-100 text-maki-gray hover:bg-gray-200')}>
                      {n}
                    </motion.button>
                  ))}
                </div>
                <div className="text-center p-3 bg-maki-light rounded-xl">
                  <p className="text-sm text-maki-gray">Cada persona paga</p>
                  <p className="text-touch-2xl font-bold text-maki-dark">{formatCurrency(totalWithTip / splitCount)}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Print receipt toggle */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-card">
            <span className="flex items-center gap-2 font-medium text-maki-dark"><PrinterIcon className="w-5 h-5" />Imprimir recibo</span>
            <Toggle checked={printReceipt} onChange={setPrintReceipt} />
          </div>
        </div>

        {/* RIGHT: Payment method + NumPad */}
        <div className="w-[420px] bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
          <div className="p-6 flex-1">
            <h3 className="text-touch-base font-bold text-maki-dark mb-3">Metodo de Pago</h3>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {paymentMethods.map((method) => (
                <motion.button key={method.id} whileTap={{ scale: 0.96 }} onClick={() => { setSelectedMethod(method.id); setCashAmount(''); }}
                  className={cn('min-h-[72px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-150 touch-manipulation border-2',
                    selectedMethod === method.id ? 'border-maki-gold bg-maki-gold/5 shadow-sm' : 'border-gray-200 hover:border-gray-300 bg-white')}>
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', method.color)}><method.icon className="w-5 h-5 text-white" /></div>
                  <span className={cn('text-sm font-semibold', selectedMethod === method.id ? 'text-maki-gold' : 'text-maki-gray')}>{method.label}</span>
                </motion.button>
              ))}
            </div>

            {selectedMethod === 'CASH' && (
              <div>
                <h3 className="text-touch-base font-bold text-maki-dark mb-3">Monto Recibido</h3>
                <QuickAmounts amounts={[20, 50, 100, totalWithTip]} onSelect={(amount) => setCashAmount(amount.toString())} className="mb-4" />
                <NumPad value={cashAmount} onChange={setCashAmount} showCurrency />
                {cashValue > 0 && (
                  <div className={cn('mt-4 p-4 rounded-2xl text-center', cashValue >= totalWithTip ? 'bg-emerald-50' : 'bg-red-50')}>
                    <p className="text-sm text-maki-gray">Cambio</p>
                    <p className={cn('text-touch-3xl font-bold', cashValue >= totalWithTip ? 'text-emerald-600' : 'text-red-600')}>
                      {cashValue >= totalWithTip ? formatCurrency(change) : `Faltan ${formatCurrency(totalWithTip - cashValue)}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedMethod !== 'CASH' && (
              <div className="text-center p-6 bg-maki-light rounded-2xl">
                <p className="text-sm text-maki-gray mb-2">Total a cobrar</p>
                <p className="text-touch-3xl font-bold text-maki-dark">{formatCurrency(totalWithTip)}</p>
                <p className="text-sm text-maki-gray mt-2">
                  {selectedMethod === 'CARD' && 'Pasa la tarjeta por el terminal'}
                  {selectedMethod === 'YAPPY' && 'El cliente debe confirmar en Yappy'}
                  {selectedMethod === 'TRANSFER' && 'Verifica la transferencia recibida'}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100">
            <Button variant="success" size="xl" fullWidth loading={isProcessing} disabled={!canProcess} onClick={handleProcessPayment} icon={<CheckCircleIcon className="w-6 h-6" />}>
              Cobrar {formatCurrency(totalWithTip)}
            </Button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DGI FACTURA ELECTRONICA MODAL                                */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showInvoiceModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                    <DocumentTextIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Factura Electronica</h2>
                    <p className="text-sm text-gray-500">DGI - Direccion General de Ingresos</p>
                  </div>
                </div>
                {dgiStep === 'idle' && <button onClick={handleSkipInvoice} className="text-gray-400 hover:text-gray-600 p-2"><XMarkIcon className="w-6 h-6" /></button>}
              </div>

              {/* ---- STEP: IDLE (before sending) ---- */}
              {dgiStep === 'idle' && (
                <div className="p-6">
                  {/* Payment success banner */}
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <CheckCircleIcon className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-emerald-800">Pago Exitoso - {formatCurrency(totalWithTip)}</p>
                      <p className="text-sm text-emerald-600">Orden #{order.orderNumber} {selectedMethod === 'CASH' && change > 0 ? `| Cambio: ${formatCurrency(change)}` : ''}</p>
                    </div>
                  </div>

                  {/* Invoice type selector */}
                  <h3 className="font-bold text-gray-900 mb-3">Tipo de Factura</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setInvoiceType('consumidor_final')}
                      className={cn('p-4 rounded-2xl border-2 text-left transition-all', invoiceType === 'consumidor_final' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                      <div className="flex items-center gap-2 mb-1">
                        <UserGroupIcon className={cn('w-5 h-5', invoiceType === 'consumidor_final' ? 'text-blue-600' : 'text-gray-400')} />
                        <span className={cn('font-bold', invoiceType === 'consumidor_final' ? 'text-blue-700' : 'text-gray-700')}>Consumidor Final</span>
                      </div>
                      <p className="text-xs text-gray-500">Sin RUC - Factura generica</p>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setInvoiceType('contribuyente')}
                      className={cn('p-4 rounded-2xl border-2 text-left transition-all', invoiceType === 'contribuyente' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300')}>
                      <div className="flex items-center gap-2 mb-1">
                        <BuildingLibraryIcon className={cn('w-5 h-5', invoiceType === 'contribuyente' ? 'text-blue-600' : 'text-gray-400')} />
                        <span className={cn('font-bold', invoiceType === 'contribuyente' ? 'text-blue-700' : 'text-gray-700')}>Contribuyente</span>
                      </div>
                      <p className="text-xs text-gray-500">Con RUC y razon social</p>
                    </motion.button>
                  </div>

                  {invoiceType === 'contribuyente' && (
                    <div className="space-y-3 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">RUC</label>
                        <input type="text" placeholder="Ej: 8-123-456" value={invoiceRuc} onChange={(e) => setInvoiceRuc(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Razon Social</label>
                        <input type="text" placeholder="Nombre de la empresa" value={invoiceBusinessName} onChange={(e) => setInvoiceBusinessName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg" />
                      </div>
                    </div>
                  )}

                  {/* Order summary mini */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">Detalle de Factura</h4>
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm py-1">
                        <span className="text-gray-600">{item.quantity}x {item.name}</span>
                        <span className="font-medium text-gray-800">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">ITBMS (7%)</span><span>{formatCurrency(order.taxAmount)}</span></div>
                      <div className="flex justify-between font-bold text-base mt-1"><span>Total</span><span>{formatCurrency(order.total)}</span></div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="ghost" size="lg" onClick={handleSkipInvoice} className="flex-1">Sin Factura</Button>
                    <Button variant="primary" size="lg" onClick={handleGenerateInvoice} icon={<BuildingLibraryIcon className="w-5 h-5" />} className="flex-1 !bg-blue-600 hover:!bg-blue-700">Enviar a DGI</Button>
                  </div>
                </div>
              )}

              {/* ---- STEP: PROCESSING ANIMATION ---- */}
              {(dgiStep === 'connecting' || dgiStep === 'signing' || dgiStep === 'sending' || dgiStep === 'processing') && (
                <div className="p-8">
                  <div className="flex flex-col items-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                      <ArrowPathIcon className="w-10 h-10 text-blue-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Procesando Factura Electronica</h3>
                    <p className="text-gray-500 mb-8">Conectando con DGI...</p>

                    <div className="w-full max-w-md space-y-3">
                      {([
                        { key: 'connecting', label: 'Conectando con servidor DGI', icon: BuildingLibraryIcon },
                        { key: 'signing', label: 'Firmando documento XML', icon: ShieldCheckIcon },
                        { key: 'sending', label: 'Enviando factura electronica', icon: DocumentDuplicateIcon },
                        { key: 'processing', label: 'DGI procesando autorizacion', icon: CheckCircleIcon },
                      ] as const).map((step, stepIdx) => {
                        const stepOrder = ['connecting', 'signing', 'sending', 'processing'] as const;
                        const currentIdx = stepOrder.indexOf(dgiStep as typeof stepOrder[number]);
                        const isActive = stepIdx === currentIdx;
                        const isDone = stepIdx < currentIdx;
                        const isPending = stepIdx > currentIdx;

                        return (
                          <motion.div key={step.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: stepIdx * 0.1 }}
                            className={cn('flex items-center gap-3 p-3 rounded-xl transition-all',
                              isActive && 'bg-blue-50 border border-blue-200', isDone && 'bg-emerald-50 border border-emerald-200', isPending && 'bg-gray-50 border border-gray-100')}>
                            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              isActive && 'bg-blue-600', isDone && 'bg-emerald-500', isPending && 'bg-gray-300')}>
                              {isDone ? <CheckCircleIcon className="w-5 h-5 text-white" />
                                : isActive ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><ArrowPathIcon className="w-4 h-4 text-white" /></motion.div>
                                : <step.icon className="w-4 h-4 text-white" />}
                            </div>
                            <span className={cn('font-medium text-sm', isActive && 'text-blue-700', isDone && 'text-emerald-700', isPending && 'text-gray-400')}>{step.label}</span>
                            {isActive && <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="ml-auto text-xs text-blue-500 font-medium">En proceso...</motion.div>}
                            {isDone && <span className="ml-auto text-xs text-emerald-500 font-medium">Completado</span>}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ---- STEP: AUTHORIZED (show invoice) ---- */}
              {dgiStep === 'authorized' && dgiResponse && (
                <div className="p-6">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}>
                      <ShieldCheckIcon className="w-10 h-10 text-emerald-600" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-emerald-800">Factura Autorizada por DGI</p>
                      <p className="text-sm text-emerald-600">Ambiente: {dgiResponse.dgi.environment}</p>
                    </div>
                  </motion.div>

                  {/* Invoice document */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="bg-gray-900 text-white p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold">{dgiResponse.emitter.tradeName}</h3>
                          <p className="text-sm text-gray-300">{dgiResponse.emitter.businessName}</p>
                          <p className="text-xs text-gray-400 mt-1">RUC: {dgiResponse.emitter.ruc} DV: {dgiResponse.emitter.dv}</p>
                          <p className="text-xs text-gray-400">{dgiResponse.emitter.address}</p>
                          <p className="text-xs text-gray-400">{dgiResponse.emitter.phone} | {dgiResponse.emitter.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-maki-gold">FACTURA ELECTRONICA</p>
                          <p className="text-lg font-bold mt-1">{dgiResponse.document.number}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(dgiResponse.document.issueDate).toLocaleDateString('es-PA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-600 font-semibold">CUFE:</span>
                          <p className="text-blue-800 font-mono text-[10px] break-all">{dgiResponse.dgi.cufe}</p>
                        </div>
                        <div>
                          <span className="text-blue-600 font-semibold">No. Autorizacion:</span>
                          <p className="text-blue-800 font-bold">{dgiResponse.dgi.authorizationNumber}</p>
                          <span className="text-blue-600 font-semibold">Protocolo:</span>
                          <p className="text-blue-800">{dgiResponse.dgi.protocolNumber}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between text-sm">
                      <div><span className="text-gray-500">Cliente:</span><p className="font-semibold text-gray-800">{dgiResponse.receiver.businessName}</p></div>
                      <div className="text-right"><span className="text-gray-500">RUC:</span><p className="font-semibold text-gray-800">{dgiResponse.receiver.ruc}</p></div>
                    </div>

                    <div className="px-4 py-3">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-gray-200 text-gray-500">
                          <th className="text-left py-2 font-medium">#</th><th className="text-left py-2 font-medium">Descripcion</th>
                          <th className="text-center py-2 font-medium">Cant.</th><th className="text-right py-2 font-medium">P.Unit.</th>
                          <th className="text-right py-2 font-medium">ITBMS</th><th className="text-right py-2 font-medium">Total</th>
                        </tr></thead>
                        <tbody>
                          {dgiResponse.items.map((item) => (
                            <tr key={item.lineNumber} className="border-b border-gray-100">
                              <td className="py-2 text-gray-400">{item.lineNumber}</td>
                              <td className="py-2 font-medium text-gray-800">{item.description}</td>
                              <td className="py-2 text-center">{item.quantity}</td>
                              <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="py-2 text-right text-gray-500">{formatCurrency(item.taxAmount)}</td>
                              <td className="py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-1">
                          <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal:</span><span>{formatCurrency(dgiResponse.totals.subtotal)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-gray-500">ITBMS (7%):</span><span>{formatCurrency(dgiResponse.totals.itbms)}</span></div>
                          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2"><span>TOTAL:</span><span>{formatCurrency(dgiResponse.totals.total)}</span></div>
                          <p className="text-[10px] text-gray-400 text-right italic">{dgiResponse.totals.totalInWords}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200"><QrCodeIcon className="w-10 h-10 text-gray-600" /></div>
                        <div>
                          <p className="text-xs text-gray-500">Verifica tu factura en:</p>
                          <p className="text-xs text-blue-600 font-medium break-all">{dgiResponse.dgi.qrCodeUrl}</p>
                          <p className="text-[10px] text-gray-400 mt-1">Fecha: {new Date(dgiResponse.dgi.authorizationDate).toLocaleString('es-PA')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 rounded-lg">
                        <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">XML FIRMADO</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button variant="ghost" size="lg" icon={<PrinterIcon className="w-5 h-5" />} className="flex-1" onClick={() => toast('Enviando a impresora...', { icon: '🖨️' })}>Imprimir</Button>
                    <Button variant="primary" size="lg" onClick={handleDone} className="flex-1" icon={<CheckCircleIcon className="w-5 h-5" />}>Listo</Button>
                  </div>
                </div>
              )}

              {/* ---- STEP: ERROR ---- */}
              {dgiStep === 'error' && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><XMarkIcon className="w-8 h-8 text-red-600" /></div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Error de Conexion con DGI</h3>
                  <p className="text-gray-500 mb-6">No se pudo conectar con el servidor de la DGI. El pago ya fue procesado.</p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="ghost" onClick={handleSkipInvoice}>Continuar sin Factura</Button>
                    <Button variant="primary" onClick={() => setDgiStep('idle')}>Reintentar</Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal (when skipping invoice) */}
      <Modal isOpen={showSuccess} onClose={handleDone} showClose={false} closeOnOverlay={false} size="sm">
        <div className="text-center py-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-14 h-14 text-emerald-600" />
          </motion.div>
          <h2 className="text-touch-2xl font-bold text-maki-dark mb-2">Pago Exitoso</h2>
          <p className="text-maki-gray mb-1">Orden #{order.orderNumber} cobrada</p>
          <p className="text-touch-xl font-bold text-emerald-600 mb-1">{formatCurrency(totalWithTip)}</p>
          {selectedMethod === 'CASH' && change > 0 && <p className="text-touch-lg font-semibold text-maki-gold">Cambio: {formatCurrency(change)}</p>}
          <Button variant="primary" size="lg" fullWidth onClick={handleDone} className="mt-6">Listo</Button>
        </div>
      </Modal>
    </MainLayout>
  );
}
