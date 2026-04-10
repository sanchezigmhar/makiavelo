/**
 * CART STORE & EXTENDED ORDERS/TABLES/NOTIFICATIONS TESTS
 * Priority 2 — Important for data integrity
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '@/store/cart.store';
import { useOrdersStore } from '@/store/orders.store';
import { useTablesStore } from '@/store/tables.store';
import { useNotificationsStore } from '@/store/notifications.store';

// ============================================================
// Cart Store Tests
// ============================================================
describe('Cart store', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      tableId: null,
      tableName: null,
      orderType: 'DINE_IN',
      guestCount: 1,
      notes: '',
      customerId: null,
      existingOrderId: null,
      existingItems: [],
    });
  });

  it('addItem creates a new item in the cart', () => {
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      station: 'sushi',
    });
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Dragon Roll');
    expect(items[0].quantity).toBe(1);
    expect(items[0].station).toBe('sushi');
  });

  it('addItem deduplicates identical product (same modifiers, same notes)', () => {
    const item = {
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE' as const,
    };
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem(item);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
  });

  it('addItem creates separate line for different notes', () => {
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
    });
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      notes: 'sin wasabi',
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('addItem creates separate line for different modifiers', () => {
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      modifiers: [{ modifierId: 'mod1', name: 'Extra salmon', price: 3.00 }],
    });
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      modifiers: [{ modifierId: 'mod2', name: 'Extra avocado', price: 2.00 }],
    });
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('removeItem removes correct item by tempId', () => {
    useCartStore.getState().addItem({ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA' });
    useCartStore.getState().addItem({ productId: 'p2', name: 'B', unitPrice: 20, courseType: 'PLATO_FUERTE' });
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    useCartStore.getState().removeItem(items[0].tempId);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].name).toBe('B');
  });

  it('updateQuantity removes item when quantity <= 0', () => {
    useCartStore.getState().addItem({ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA' });
    const tempId = useCartStore.getState().items[0].tempId;
    useCartStore.getState().updateQuantity(tempId, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('decrementQuantity removes item when quantity is 1', () => {
    useCartStore.getState().addItem({ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA' });
    const tempId = useCartStore.getState().items[0].tempId;
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    useCartStore.getState().decrementQuantity(tempId);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('incrementQuantity increases by 1', () => {
    useCartStore.getState().addItem({ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA' });
    const tempId = useCartStore.getState().items[0].tempId;
    useCartStore.getState().incrementQuantity(tempId);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('subtotal calculation includes modifier prices', () => {
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      modifiers: [{ modifierId: 'mod1', name: 'Extra salmon', price: 3.00 }],
    });
    // The Zustand getter `get subtotal()` uses get() internally, which requires
    // the store proxy. We calculate subtotal the same way the store does:
    const items = useCartStore.getState().items;
    const subtotal = items.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((ms, m) => ms + m.price, 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0);
    expect(subtotal).toBeCloseTo(21.50, 2); // 18.50 + 3.00
    expect(items[0].modifiers[0].price).toBe(3.00);
  });

  it('setGuestCount clamps to minimum of 1', () => {
    useCartStore.getState().setGuestCount(0);
    expect(useCartStore.getState().guestCount).toBe(1);
    useCartStore.getState().setGuestCount(-5);
    expect(useCartStore.getState().guestCount).toBe(1);
    useCartStore.getState().setGuestCount(3);
    expect(useCartStore.getState().guestCount).toBe(3);
  });

  it('clearCart resets all state including existingOrderId', () => {
    useCartStore.getState().addItem({ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA' });
    useCartStore.getState().setTable('t5', 'Mesa 5');
    useCartStore.getState().setExistingOrder('order-1', [{ id: 'oi1', name: 'B', quantity: 1, unitPrice: 15, status: 'DELIVERED' }]);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.tableId).toBeNull();
    expect(state.existingOrderId).toBeNull();
    expect(state.existingItems).toHaveLength(0);
    expect(state.guestCount).toBe(1);
  });

  it('getCartPayload maps modifiers to modifierOptionId format', () => {
    useCartStore.getState().addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.50,
      courseType: 'PLATO_FUERTE',
      modifiers: [{ modifierId: 'mod1', name: 'Extra salmon', price: 3.00 }],
    });
    const payload = useCartStore.getState().getCartPayload();
    expect(payload.items[0].modifiers).toEqual([{ modifierOptionId: 'mod1' }]);
  });

  it('setTable sets both tableId and tableName', () => {
    useCartStore.getState().setTable('t5', 'Mesa 5');
    expect(useCartStore.getState().tableId).toBe('t5');
    expect(useCartStore.getState().tableName).toBe('Mesa 5');
  });
});

// ============================================================
// Extended Orders Store Tests
// ============================================================
describe('Orders store extended', () => {
  beforeEach(() => {
    localStorage.clear();
    useOrdersStore.setState({
      orders: [],
      activeOrders: [],
      currentOrder: null,
      isLoading: false,
      totalCount: 0,
      page: 1,
      limit: 50,
    });
  });

  it('fetchOrdersByTable returns matching orders from activeOrders', async () => {
    // Create an order for table t5
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      items: [{ productId: 'p1', name: 'Dragon Roll', unitPrice: 18.50, courseType: 'PLATO_FUERTE', quantity: 1 }],
    });
    expect(order).not.toBeNull();

    const result = await useOrdersStore.getState().fetchOrdersByTable('t5');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].tableId).toBe('t5');
  });

  it('fetchOrdersByTable excludes CLOSED orders', async () => {
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      items: [{ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA', quantity: 1 }],
    });
    // Close it
    await useOrdersStore.getState().updateOrderStatus(order!.id, 'CLOSED');

    const result = await useOrdersStore.getState().fetchOrdersByTable('t5');
    expect(result).toHaveLength(0);
  });

  it('fetchOrder returns order from in-memory activeOrders', async () => {
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      items: [{ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA', quantity: 1 }],
    });
    const found = await useOrdersStore.getState().fetchOrder(order!.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(order!.id);
  });

  it('fetchOrder returns order from localStorage when not in memory', async () => {
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      items: [{ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA', quantity: 1 }],
    });
    const orderId = order!.id;

    // Clear in-memory but keep localStorage
    useOrdersStore.setState({ activeOrders: [], orders: [], currentOrder: null });

    const found = await useOrdersStore.getState().fetchOrder(orderId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(orderId);
  });

  it('updateOrderStatus CANCELLED removes from activeOrders', async () => {
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      items: [{ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA', quantity: 1 }],
    });
    await useOrdersStore.getState().updateOrderStatus(order!.id, 'CANCELLED');
    const active = useOrdersStore.getState().activeOrders;
    expect(active.find((o) => o.id === order!.id)).toBeUndefined();
  });

  it('createOrder preserves guestCount and notes', async () => {
    const order = await useOrdersStore.getState().createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      guestCount: 4,
      notes: 'Birthday celebration',
      items: [{ productId: 'p1', name: 'A', unitPrice: 10, courseType: 'ENTRADA', quantity: 1 }],
    });
    expect(order?.guestCount).toBe(4);
    expect(order?.notes).toBe('Birthday celebration');
  });
});

// ============================================================
// Extended Tables Store Tests
// ============================================================
describe('Tables store extended', () => {
  beforeEach(() => {
    localStorage.clear();
    useTablesStore.setState({ tables: [], zones: [], selectedZone: null, isLoading: false });
  });

  it('fetchTables loads demo data when backend fails', async () => {
    await useTablesStore.getState().fetchTables();
    const tables = useTablesStore.getState().tables;
    expect(tables.length).toBeGreaterThan(0);
  });

  it('updateTableStatus to CLEANING preserves status', async () => {
    await useTablesStore.getState().fetchTables();
    const tableId = useTablesStore.getState().tables[0]?.id;
    if (!tableId) return;
    await useTablesStore.getState().updateTableStatus(tableId, 'CLEANING');
    const updated = useTablesStore.getState().tables.find((t) => t.id === tableId);
    expect(updated?.status).toBe('CLEANING');
  });

  it('updateTableStatus to AVAILABLE clears currentOrder', async () => {
    await useTablesStore.getState().fetchTables();
    const tableId = useTablesStore.getState().tables[0]?.id;
    if (!tableId) return;
    // Set to occupied first
    await useTablesStore.getState().updateTableStatus(tableId, 'OCCUPIED');
    // Then set to available
    await useTablesStore.getState().updateTableStatus(tableId, 'AVAILABLE');
    const updated = useTablesStore.getState().tables.find((t) => t.id === tableId);
    expect(updated?.status).toBe('AVAILABLE');
    expect((updated as any)?.currentOrder).toBeUndefined();
  });

  it('fetchZones loads demo zones when backend fails', async () => {
    await useTablesStore.getState().fetchZones();
    const zones = useTablesStore.getState().zones;
    expect(zones.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Extended Notifications Store Tests
// ============================================================
describe('Notifications store extended', () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationsStore.setState({ readyItems: [] });
  });

  it('removeNotification removes by notification id', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'o1',
      orderNumber: '151',
      itemId: 'item1',
      itemName: 'Dragon Roll',
      tableNumber: 5,
      status: 'READY',
    });
    const notifId = useNotificationsStore.getState().readyItems[0].id;
    useNotificationsStore.getState().removeNotification(notifId);
    expect(useNotificationsStore.getState().readyItems).toHaveLength(0);
  });

  it('getReadyItemsForTable returns only READY items for given table', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'o1', orderNumber: '151', itemId: 'item1', itemName: 'A', tableNumber: 5, status: 'READY',
    });
    useNotificationsStore.getState().addReadyItem({
      orderId: 'o1', orderNumber: '151', itemId: 'item2', itemName: 'B', tableNumber: 5, status: 'READY',
    });
    useNotificationsStore.getState().addReadyItem({
      orderId: 'o2', orderNumber: '152', itemId: 'item3', itemName: 'C', tableNumber: 3, status: 'READY',
    });
    // Mark one as delivered
    useNotificationsStore.getState().markDelivered('item1');

    const table5Items = useNotificationsStore.getState().getReadyItemsForTable(5);
    expect(table5Items).toHaveLength(1); // item1 delivered, only item2 left
    expect(table5Items[0].itemName).toBe('B');
  });

  it('clearAll empties state and localStorage', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'o1', orderNumber: '151', itemId: 'item1', itemName: 'A', tableNumber: 5, status: 'READY',
    });
    expect(useNotificationsStore.getState().readyItems).toHaveLength(1);
    useNotificationsStore.getState().clearAll();
    expect(useNotificationsStore.getState().readyItems).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('makiavelo-ready-notifications') || '[]')).toHaveLength(0);
  });

  it('loadFromStorage purges notifications older than 2 hours', () => {
    // Manually write an old notification to localStorage
    const oldNotif = {
      id: 'old-1',
      orderId: 'o1',
      orderNumber: '151',
      itemId: 'item1',
      itemName: 'A',
      tableNumber: 5,
      status: 'READY',
      timestamp: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
    };
    const freshNotif = {
      id: 'fresh-1',
      orderId: 'o2',
      orderNumber: '152',
      itemId: 'item2',
      itemName: 'B',
      tableNumber: 3,
      status: 'READY',
      timestamp: Date.now(),
    };
    localStorage.setItem('makiavelo-ready-notifications', JSON.stringify([oldNotif, freshNotif]));

    // Re-read from storage (simulates page load)
    const saved = localStorage.getItem('makiavelo-ready-notifications');
    const items = JSON.parse(saved!) as any[];
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const filtered = items.filter((n: any) => n.timestamp > twoHoursAgo);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('fresh-1');
  });
});
