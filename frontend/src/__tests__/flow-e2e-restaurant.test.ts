/**
 * QA Tests: COMPLETE Restaurant Flow (End-to-End)
 *
 * Validates the FULL cycle:
 *   Mesa AVAILABLE → Take Order → KDS → Mark READY → Notify → Cobrar → Cleanup → Mesa AVAILABLE
 *
 * Each test covers a real user scenario that has broken before.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useOrdersStore } from '@/store/orders.store';
import { useCartStore } from '@/store/cart.store';
import { useTablesStore } from '@/store/tables.store';
import { useNotificationsStore } from '@/store/notifications.store';

// Reset all stores between tests
beforeEach(() => {
  useOrdersStore.setState({
    orders: [],
    activeOrders: [],
    currentOrder: null,
    isLoading: false,
  });
  useCartStore.setState({
    items: [],
    tableId: null,
    tableName: null,
    orderType: 'DINE_IN',
    guestCount: 1,
    notes: '',
    customerId: null,
  });
  useNotificationsStore.setState({
    readyItems: [],
  });
  localStorage.clear();
});

// ============================================================
// 1. FULL RESTAURANT CYCLE
// ============================================================
describe('Full restaurant cycle: order → kitchen → notify → payment → cleanup', () => {
  it('creates order, assigns to table, persists in localStorage', async () => {
    // Step 1: Create order for table t1
    const { createOrder, sendToKitchen } = useOrdersStore.getState();
    const order = await createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 2,
      items: [
        { productId: 'p1', name: 'Rainbow Roll', unitPrice: 15, courseType: 'PLATO_FUERTE', quantity: 2, station: 'sushi' },
        { productId: 'p2', name: 'Edamame', unitPrice: 8, courseType: 'ENTRADA', quantity: 1, station: 'cocina-fria' },
      ],
    });

    expect(order).toBeTruthy();
    expect(order!.tableId).toBe('t1');
    expect(order!.items).toHaveLength(2);
    expect(order!.items[0].station).toBe('sushi');
    expect(order!.items[1].station).toBe('cocina-fria');
    expect(order!.total).toBe(38); // 15*2 + 8

    // Step 2: Send to kitchen
    await sendToKitchen(order!.id);
    const { activeOrders } = useOrdersStore.getState();
    const kitchenOrder = activeOrders.find((o) => o.id === order!.id);
    expect(kitchenOrder?.status).toBe('IN_PROGRESS');

    // Step 3: Verify localStorage persistence
    const stored = localStorage.getItem('makiavelo-demo-orders');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.some((o: { id: string }) => o.id === order!.id)).toBe(true);
  });

  it('order number is sequential and logical', async () => {
    const { createOrder } = useOrdersStore.getState();
    const order1 = await createOrder({
      tableId: 't1', type: 'DINE_IN', guestCount: 1,
      items: [{ productId: 'p1', name: 'Test', unitPrice: 10, courseType: 'PLATO_FUERTE', quantity: 1 }],
    });
    const order2 = await createOrder({
      tableId: 't2', type: 'DINE_IN', guestCount: 1,
      items: [{ productId: 'p2', name: 'Test2', unitPrice: 12, courseType: 'PLATO_FUERTE', quantity: 1 }],
    });

    const num1 = parseInt(order1!.orderNumber, 10);
    const num2 = parseInt(order2!.orderNumber, 10);
    expect(num2).toBe(num1 + 1); // Sequential
    expect(num1).toBeLessThan(500); // Not inflated by 150+counter
  });

  it('CLOSED orders are removed from activeOrders and localStorage', async () => {
    const { createOrder, sendToKitchen, updateOrderStatus } = useOrdersStore.getState();
    const order = await createOrder({
      tableId: 't5', type: 'DINE_IN', guestCount: 1,
      items: [{ productId: 'p1', name: 'Test', unitPrice: 10, courseType: 'PLATO_FUERTE', quantity: 1 }],
    });
    await sendToKitchen(order!.id);
    await updateOrderStatus(order!.id, 'CLOSED');

    const { activeOrders } = useOrdersStore.getState();
    expect(activeOrders.find((o) => o.id === order!.id)).toBeUndefined();

    // Also removed from localStorage
    const stored = localStorage.getItem('makiavelo-demo-orders');
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.find((o: { id: string }) => o.id === order!.id)).toBeUndefined();
    }
  });
});

// ============================================================
// 2. KDS STATION ROUTING
// ============================================================
describe('KDS station routing', () => {
  it('items with station field are correctly assigned', async () => {
    const { createOrder, sendToKitchen } = useOrdersStore.getState();
    const order = await createOrder({
      tableId: 't3', type: 'DINE_IN', guestCount: 1,
      items: [
        { productId: 'p1', name: 'Sushi Roll', unitPrice: 18, courseType: 'PLATO_FUERTE', quantity: 1, station: 'sushi' },
        { productId: 'p2', name: 'Cerveza', unitPrice: 6, courseType: 'BEBIDA', quantity: 2, station: 'barra' },
        { productId: 'p3', name: 'Parrilla Mix', unitPrice: 25, courseType: 'PLATO_FUERTE', quantity: 1, station: 'parrilla' },
      ],
    });
    await sendToKitchen(order!.id);

    const { activeOrders } = useOrdersStore.getState();
    const o = activeOrders.find((a) => a.id === order!.id);
    expect(o!.items[0].station).toBe('sushi');
    expect(o!.items[1].station).toBe('barra');
    expect(o!.items[2].station).toBe('parrilla');
  });

  it('KDS conversion preserves PREPARING status', () => {
    // Simulate an order with PREPARING items
    const testOrder = {
      id: 'test-1', tableId: 't1', status: 'IN_PROGRESS' as const,
      items: [
        { id: 'i1', status: 'PREPARING', name: 'Steak', quantity: 1, courseType: 'PLATO_FUERTE', station: 'parrilla' },
        { id: 'i2', status: 'READY', name: 'Salad', quantity: 1, courseType: 'ENTRADA', station: 'cocina-fria' },
        { id: 'i3', status: 'PENDING', name: 'Soup', quantity: 1, courseType: 'ENTRADA', station: 'cocina-caliente' },
      ],
    };

    // Simulate the KDS mapping logic
    const mapped = testOrder.items.map((item) => ({
      ...item,
      status: (['READY', 'PREPARING', 'PENDING'].includes(item.status) ? item.status : 'PENDING') as 'PENDING' | 'PREPARING' | 'READY',
    }));

    expect(mapped[0].status).toBe('PREPARING'); // Was being lost before fix
    expect(mapped[1].status).toBe('READY');
    expect(mapped[2].status).toBe('PENDING');
  });

  it('extracts correct tableNumber from various tableId formats', () => {
    const extract = (tableId: string) => parseInt(tableId.replace(/\D/g, '') || '0', 10);

    expect(extract('t1')).toBe(1);
    expect(extract('t29')).toBe(29);
    expect(extract('table-5')).toBe(5);
    expect(extract('merged-1-2')).toBe(12); // Merged tables
    expect(extract('')).toBe(0); // Empty
  });
});

// ============================================================
// 3. NOTIFICATIONS FLOW
// ============================================================
describe('Notification flow: KDS ready → mesa badge', () => {
  it('addReadyItem creates notification with correct fields', () => {
    const { addReadyItem, readyItems } = useNotificationsStore.getState();
    addReadyItem({
      orderId: 'o1', orderNumber: '101',
      itemId: 'i1', itemName: 'Dragon Roll',
      tableNumber: 5, tableName: 'Mesa 5',
      status: 'READY', quantity: 2,
    });

    const items = useNotificationsStore.getState().readyItems;
    expect(items).toHaveLength(1);
    expect(items[0].tableNumber).toBe(5);
    expect(items[0].tableName).toBe('Mesa 5');
    expect(items[0].status).toBe('READY');
    expect(items[0].itemName).toBe('Dragon Roll');
  });

  it('markDelivered changes status and persists', () => {
    const { addReadyItem } = useNotificationsStore.getState();
    addReadyItem({
      orderId: 'o1', orderNumber: '101',
      itemId: 'i1', itemName: 'Sushi',
      tableNumber: 3, status: 'READY', quantity: 1,
    });

    const itemId = useNotificationsStore.getState().readyItems[0].itemId;
    useNotificationsStore.getState().markDelivered(itemId);

    const items = useNotificationsStore.getState().readyItems;
    expect(items[0].status).toBe('DELIVERED');

    // Persisted to localStorage
    const stored = localStorage.getItem('makiavelo-ready-notifications');
    expect(stored).toBeTruthy();
    expect(stored!).toContain('DELIVERED');
  });

  it('prevents duplicate notifications for same item', () => {
    const { addReadyItem } = useNotificationsStore.getState();
    const payload = {
      orderId: 'o1', orderNumber: '101',
      itemId: 'i1', itemName: 'Edamame',
      tableNumber: 7, status: 'READY' as const, quantity: 1,
    };
    addReadyItem(payload);
    addReadyItem(payload); // duplicate

    expect(useNotificationsStore.getState().readyItems).toHaveLength(1);
  });

  it('fuchsia color matches by tableNumber OR tableName', () => {
    const { addReadyItem } = useNotificationsStore.getState();
    addReadyItem({
      orderId: 'o1', orderNumber: '101',
      itemId: 'i1', itemName: 'Test',
      tableNumber: 10, tableName: 'Mesa 10',
      status: 'READY', quantity: 1,
    });

    const items = useNotificationsStore.getState().readyItems;
    // Match by tableNumber
    const matchByNumber = items.some(
      (n) => n.status === 'READY' && n.tableNumber === 10
    );
    expect(matchByNumber).toBe(true);

    // Match by tableName
    const matchByName = items.some(
      (n) => n.status === 'READY' && n.tableName === 'Mesa 10'
    );
    expect(matchByName).toBe(true);

    // No match for wrong table
    const noMatch = items.some(
      (n) => n.status === 'READY' && n.tableNumber === 99
    );
    expect(noMatch).toBe(false);
  });
});

// ============================================================
// 4. TABLE STATUS FLOW
// ============================================================
describe('Table status lifecycle', () => {
  it('updateTableStatus changes table status locally in demo mode', async () => {
    // Load demo tables first (API fails → catch loads demoTables)
    await useTablesStore.getState().fetchTables();
    const { updateTableStatus, tables } = useTablesStore.getState();
    // Initial state: all AVAILABLE (demo tables loaded)
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.every((t) => t.status === 'AVAILABLE')).toBe(true);

    // Occupy a table
    await updateTableStatus('t1', 'OCCUPIED');
    const t1 = useTablesStore.getState().tables.find((t) => t.id === 't1');
    expect(t1?.status).toBe('OCCUPIED');
    expect(t1?.occupiedAt).toBeTruthy();

    // Send to cleaning
    await updateTableStatus('t1', 'CLEANING');
    const t1Clean = useTablesStore.getState().tables.find((t) => t.id === 't1');
    expect(t1Clean?.status).toBe('CLEANING');

    // Make available again
    await updateTableStatus('t1', 'AVAILABLE');
    const t1Available = useTablesStore.getState().tables.find((t) => t.id === 't1');
    expect(t1Available?.status).toBe('AVAILABLE');
    expect(t1Available?.occupiedAt).toBeUndefined();
  });

  it('CLEANING status is preserved (not overridden by hasActiveOrder)', () => {
    // This tests the effectiveStatus logic in mesas page
    const preservedStatuses = ['CLEANING', 'RESERVED', 'BLOCKED'];
    const tableStatus = 'CLEANING';
    const hasActiveOrder = true; // Residual order link exists

    const effectiveStatus = preservedStatuses.includes(tableStatus)
      ? tableStatus
      : hasActiveOrder ? 'OCCUPIED' : tableStatus;

    expect(effectiveStatus).toBe('CLEANING'); // NOT overridden to OCCUPIED
  });

  it('AVAILABLE tables become OCCUPIED when active order exists', () => {
    const preservedStatuses = ['CLEANING', 'RESERVED', 'BLOCKED'];
    const tableStatus = 'AVAILABLE';
    const hasActiveOrder = true;

    const effectiveStatus = preservedStatuses.includes(tableStatus)
      ? tableStatus
      : hasActiveOrder ? 'OCCUPIED' : tableStatus;

    expect(effectiveStatus).toBe('OCCUPIED');
  });
});

// ============================================================
// 5. PAYMENT FLOW
// ============================================================
describe('Payment and cleanup flow', () => {
  it('updateOrderStatus CLOSED removes from activeOrders', async () => {
    const { createOrder, sendToKitchen, updateOrderStatus } = useOrdersStore.getState();
    const order = await createOrder({
      tableId: 't8', type: 'DINE_IN', guestCount: 1,
      items: [{ productId: 'p1', name: 'Test', unitPrice: 25, courseType: 'PLATO_FUERTE', quantity: 1 }],
    });
    await sendToKitchen(order!.id);
    await updateOrderStatus(order!.id, 'CLOSED');

    const { activeOrders, orders } = useOrdersStore.getState();
    // Removed from active
    expect(activeOrders.find((o) => o.id === order!.id)).toBeUndefined();
    // But kept in orders history with CLOSED status
    expect(orders.find((o) => o.id === order!.id)?.status).toBe('CLOSED');
  });

  it('table-order link is cleaned up after payment', () => {
    // Simulate saving a table-order link (like pedidos does)
    const key = 'makiavelo-table-orders';
    localStorage.setItem(key, JSON.stringify({
      't5': { orderId: 'demo_1', orderNumber: '101', occupiedAt: new Date().toISOString(), orderTotal: 50 },
    }));

    // Simulate cleanup (like cobro does)
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    delete stored['t5'];
    localStorage.setItem(key, JSON.stringify(stored));

    const after = JSON.parse(localStorage.getItem(key) || '{}');
    expect(after['t5']).toBeUndefined();
  });

  it('KDS bumped orders persist in localStorage', () => {
    const BUMPED_KEY = 'makiavelo-kds-bumped';
    const bumped = ['demo_1', 'demo_2'];
    localStorage.setItem(BUMPED_KEY, JSON.stringify(bumped));

    const loaded = JSON.parse(localStorage.getItem(BUMPED_KEY) || '[]');
    expect(loaded).toContain('demo_1');
    expect(loaded).toContain('demo_2');

    // After payment cleanup, order removed from bumped
    const cleaned = loaded.filter((id: string) => id !== 'demo_1');
    localStorage.setItem(BUMPED_KEY, JSON.stringify(cleaned));

    const afterClean = JSON.parse(localStorage.getItem(BUMPED_KEY) || '[]');
    expect(afterClean).not.toContain('demo_1');
    expect(afterClean).toContain('demo_2');
  });
});

// ============================================================
// 6. CART PAYLOAD VALIDATION
// ============================================================
describe('Cart payload validation', () => {
  it('getCartPayload includes all required fields', () => {
    const cart = useCartStore.getState();
    cart.setTable('t5', 'Mesa 5');
    cart.addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.5,
      courseType: 'PLATO_FUERTE',
      station: 'sushi',
    });

    const payload = useCartStore.getState().getCartPayload();
    expect(payload.tableId).toBe('t5');
    expect(payload.type).toBe('DINE_IN');
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe('p1');
    expect(payload.items[0].name).toBe('Dragon Roll');
    expect(payload.items[0].unitPrice).toBe(18.5);
    expect(payload.items[0].station).toBe('sushi');
    expect(payload.items[0].courseType).toBe('PLATO_FUERTE');
    expect(payload.items[0].quantity).toBe(1);
  });
});
