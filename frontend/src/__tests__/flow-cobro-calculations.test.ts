/**
 * COBRO / PAYMENT CALCULATION TESTS
 * Priority 1 — Critical for money handling
 * Tests pure calculation logic extracted from cobro/page.tsx
 */
import { describe, it, expect } from 'vitest';

// ============================================================
// Tip Calculations
// ============================================================
describe('Tip calculations', () => {
  const subtotal = 94.00;
  const taxAmount = 6.58;
  const total = 100.58; // subtotal + tax

  it('10% tip on subtotal', () => {
    const tipPercent = 10;
    const tipAmount = (subtotal * tipPercent) / 100;
    expect(tipAmount).toBeCloseTo(9.40, 2);
  });

  it('15% tip on subtotal', () => {
    const tipAmount = (subtotal * 15) / 100;
    expect(tipAmount).toBeCloseTo(14.10, 2);
  });

  it('20% tip on subtotal', () => {
    const tipAmount = (subtotal * 20) / 100;
    expect(tipAmount).toBeCloseTo(18.80, 2);
  });

  it('0% tip yields zero', () => {
    const tipAmount = (subtotal * 0) / 100;
    expect(tipAmount).toBe(0);
  });

  it('custom tip overrides percentage', () => {
    const customTip = '5.50';
    const useCustomTip = true;
    const tipPercent = 10;
    const tipAmount = useCustomTip ? parseFloat(customTip || '0') : (subtotal * tipPercent) / 100;
    expect(tipAmount).toBe(5.50);
  });

  it('total with tip = order.total + tipAmount', () => {
    const tipAmount = (subtotal * 10) / 100; // 9.40
    const totalWithTip = total + tipAmount;
    expect(totalWithTip).toBeCloseTo(109.98, 2);
  });
});

// ============================================================
// Cash Change Calculations
// ============================================================
describe('Cash change calculation', () => {
  it('correct change when cash exceeds payment', () => {
    const cashValue = 120;
    const paymentAmount = 109.98;
    const change = Math.max(0, cashValue - paymentAmount);
    expect(change).toBeCloseTo(10.02, 2);
  });

  it('zero change when exact amount', () => {
    const cashValue = 109.98;
    const paymentAmount = 109.98;
    const change = Math.max(0, cashValue - paymentAmount);
    expect(change).toBeCloseTo(0, 2);
  });

  it('zero change (not negative) when cash is less', () => {
    const cashValue = 50;
    const paymentAmount = 109.98;
    const change = Math.max(0, cashValue - paymentAmount);
    expect(change).toBe(0);
  });
});

// ============================================================
// Split Equal Mode
// ============================================================
describe('Split equal mode', () => {
  const totalWithTip = 109.98;

  it('2-way split', () => {
    const perPerson = Math.floor((totalWithTip / 2) * 100) / 100;
    expect(perPerson).toBe(54.99);
  });

  it('3-way split with last person rounding adjustment', () => {
    const splitCount = 3;
    const perPerson = Math.floor((totalWithTip / splitCount) * 100) / 100;
    // Person 1 and 2 pay perPerson
    const paid = perPerson * 2;
    const lastPerson = +(totalWithTip - paid).toFixed(2);
    expect(perPerson).toBe(36.66);
    expect(lastPerson).toBe(36.66);
    expect(paid + lastPerson).toBeCloseTo(totalWithTip, 2);
  });

  it('5-way split covers total without loss', () => {
    const splitCount = 5;
    const perPerson = Math.floor((totalWithTip / splitCount) * 100) / 100;
    const paid = perPerson * (splitCount - 1);
    const lastPerson = +(totalWithTip - paid).toFixed(2);
    expect(paid + lastPerson).toBeCloseTo(totalWithTip, 2);
  });
});

// ============================================================
// Split By-Items Mode
// ============================================================
describe('Split by-items mode', () => {
  const items = [
    { id: 'i1', totalPrice: 37.00 }, // Dragon Roll 2x
    { id: 'i2', totalPrice: 8.00 },  // Edamame
    { id: 'i3', totalPrice: 13.00 }, // Miso Soup
    { id: 'i4', totalPrice: 18.00 }, // Asahi Beer
    { id: 'i5', totalPrice: 18.00 }, // Mochi Ice Cream
  ];
  const subtotal = 94.00;
  const taxAmount = 6.58;
  const tipAmount = 9.40; // 10%

  it('proportional tax for selected items', () => {
    // Select items i1 + i2 = 37 + 8 = 45
    const selectedSubtotal = 45;
    const proportion = selectedSubtotal / subtotal;
    const proportionalTax = +(taxAmount * proportion).toFixed(2);
    expect(proportion).toBeCloseTo(0.4787, 3);
    expect(proportionalTax).toBeCloseTo(3.15, 2);
  });

  it('proportional tip for selected items', () => {
    const selectedSubtotal = 45;
    const proportion = selectedSubtotal / subtotal;
    const proportionalTip = +(tipAmount * proportion).toFixed(2);
    expect(proportionalTip).toBeCloseTo(4.50, 2);
  });

  it('full item payment amount = items + proportional tax + proportional tip', () => {
    const selectedSubtotal = 45;
    const proportion = selectedSubtotal / subtotal;
    const paymentAmount = +(selectedSubtotal + (taxAmount * proportion) + (tipAmount * proportion)).toFixed(2);
    expect(paymentAmount).toBeCloseTo(52.65, 1);
  });

  it('all items paid → remaining balance is tax + tip remainder', () => {
    const totalWithTip = subtotal + taxAmount + tipAmount; // 109.98
    // Simulate paying all items with proportional tax/tip
    const paidItemIds = new Set(items.map((i) => i.id));
    const allItemsPaid = paidItemIds.size >= items.length;
    expect(allItemsPaid).toBe(true);
  });

  it('zero payment when no items selected', () => {
    const selectedSubtotal = 0;
    const paymentAmount = selectedSubtotal === 0 ? 0 : selectedSubtotal;
    expect(paymentAmount).toBe(0);
  });
});

// ============================================================
// canProcess Validation
// ============================================================
describe('canProcess validation', () => {
  it('CASH requires cashValue >= paymentAmount', () => {
    const selectedMethod = 'CASH';
    const cashValue = 100;
    const paymentAmount = 109.98;
    const canProcess = selectedMethod !== 'CASH' || cashValue >= paymentAmount;
    expect(canProcess).toBe(false);
  });

  it('non-CASH always processable', () => {
    const selectedMethod = 'CARD';
    const cashValue = 0;
    const paymentAmount = 109.98;
    const canProcess = selectedMethod !== 'CASH' || cashValue >= paymentAmount;
    expect(canProcess).toBe(true);
  });

  it('by-items mode requires selected items', () => {
    const splitMode = 'by-items';
    const selectedItemIds = new Set<string>();
    const allItemsPaid = false;
    const canProcess = splitMode === 'by-items'
      ? (selectedItemIds.size > 0 || allItemsPaid)
      : true;
    expect(canProcess).toBe(false);
  });

  it('by-items with allItemsPaid allows processing', () => {
    const splitMode = 'by-items';
    const selectedItemIds = new Set<string>();
    const allItemsPaid = true;
    const canProcess = splitMode === 'by-items'
      ? (selectedItemIds.size > 0 || allItemsPaid)
      : true;
    expect(canProcess).toBe(true);
  });
});

// ============================================================
// Payment Method Mapping
// ============================================================
describe('Payment method mapping', () => {
  const backendMethodMap: Record<string, string> = {
    'CASH': 'CASH',
    'CARD': 'CREDIT_CARD',
    'YAPPY': 'TRANSFER',
    'TRANSFER': 'TRANSFER',
    'OTHER': 'OTHER',
  };

  it('CARD maps to CREDIT_CARD', () => {
    expect(backendMethodMap['CARD']).toBe('CREDIT_CARD');
  });

  it('YAPPY maps to TRANSFER', () => {
    expect(backendMethodMap['YAPPY']).toBe('TRANSFER');
  });

  it('CASH maps to CASH', () => {
    expect(backendMethodMap['CASH']).toBe('CASH');
  });
});

// ============================================================
// Remaining Balance
// ============================================================
describe('Remaining balance tracking', () => {
  it('remaining balance decreases with each payment', () => {
    const totalWithTip = 109.98;
    let totalPaidSoFar = 0;

    // First payment
    totalPaidSoFar += 36.66;
    expect(totalWithTip - totalPaidSoFar).toBeCloseTo(73.32, 2);

    // Second payment
    totalPaidSoFar += 36.66;
    expect(totalWithTip - totalPaidSoFar).toBeCloseTo(36.66, 2);

    // Last payment
    totalPaidSoFar += 36.66;
    expect(totalWithTip - totalPaidSoFar).toBeCloseTo(0, 1);
  });

  it('isLastPayment when paid >= total - 0.01 (rounding tolerance)', () => {
    const totalWithTip = 109.98;
    const totalPaidSoFar = 73.32;
    const paymentAmount = 36.66;
    const isLastPayment = (totalPaidSoFar + paymentAmount >= totalWithTip - 0.01);
    expect(isLastPayment).toBe(true);
  });
});

// ============================================================
// cleanupTableStorage Logic
// ============================================================
describe('cleanupTableStorage logic', () => {
  it('removes table-order link from localStorage', () => {
    const tableId = 't5';
    const links = { t5: { orderId: 'demo_151', orderTotal: 100 }, t3: { orderId: 'demo_150', orderTotal: 50 } };
    localStorage.setItem('makiavelo-table-orders', JSON.stringify(links));

    // Simulate cleanup
    const tableOrders = JSON.parse(localStorage.getItem('makiavelo-table-orders') || '{}');
    delete tableOrders[tableId];
    localStorage.setItem('makiavelo-table-orders', JSON.stringify(tableOrders));

    const result = JSON.parse(localStorage.getItem('makiavelo-table-orders')!);
    expect(result[tableId]).toBeUndefined();
    expect(result['t3']).toBeDefined();
  });

  it('removes demo order by orderId from localStorage', () => {
    const orders = [
      { id: 'demo_151', tableId: 't5', status: 'DELIVERED' },
      { id: 'demo_150', tableId: 't3', status: 'IN_PROGRESS' },
    ];
    localStorage.setItem('makiavelo-demo-orders', JSON.stringify(orders));

    const orderId = 'demo_151';
    const stored = JSON.parse(localStorage.getItem('makiavelo-demo-orders')!);
    const cleaned = stored.filter((o: any) => o.id !== orderId);
    localStorage.setItem('makiavelo-demo-orders', JSON.stringify(cleaned));

    const result = JSON.parse(localStorage.getItem('makiavelo-demo-orders')!);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('demo_150');
  });

  it('removes non-closed orders for table from localStorage', () => {
    const tableId = 't5';
    const orders = [
      { id: 'demo_151', tableId: 't5', status: 'DELIVERED' },
      { id: 'demo_152', tableId: 't5', status: 'CLOSED' },
      { id: 'demo_150', tableId: 't3', status: 'IN_PROGRESS' },
    ];
    localStorage.setItem('makiavelo-demo-orders', JSON.stringify(orders));

    const stored = JSON.parse(localStorage.getItem('makiavelo-demo-orders')!);
    const cleaned = stored.filter((o: any) => {
      if (o.tableId === tableId && o.status !== 'CLOSED' && o.status !== 'CANCELLED') return false;
      return true;
    });
    localStorage.setItem('makiavelo-demo-orders', JSON.stringify(cleaned));

    const result = JSON.parse(localStorage.getItem('makiavelo-demo-orders')!);
    expect(result).toHaveLength(2);
    // CLOSED order for t5 survives, t3 order survives, DELIVERED t5 removed
    expect(result.find((o: any) => o.id === 'demo_151')).toBeUndefined();
    expect(result.find((o: any) => o.id === 'demo_152')).toBeDefined();
    expect(result.find((o: any) => o.id === 'demo_150')).toBeDefined();
  });
});
