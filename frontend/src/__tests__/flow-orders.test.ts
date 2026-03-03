/**
 * QA Tests: Order Creation + Kitchen Flow
 * Validates: Cart → createOrder → sendToKitchen → localStorage persistence
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useOrdersStore } from '@/store/orders.store';
import { useCartStore } from '@/store/cart.store';

// Reset Zustand stores between tests
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
  localStorage.clear();
});

describe('Cart → getCartPayload', () => {
  it('getCartPayload includes station field', () => {
    const cart = useCartStore.getState();
    cart.addItem({
      productId: 'p1',
      name: 'Dragon Roll',
      unitPrice: 18.5,
      courseType: 'PLATO_FUERTE',
      station: 'sushi',
    });

    const payload = useCartStore.getState().getCartPayload();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].station).toBe('sushi');
  });

  it('getCartPayload includes all required fields', () => {
    const cart = useCartStore.getState();
    cart.addItem({
      productId: 'p16',
      name: 'Sake Copa',
      unitPrice: 8.0,
      courseType: 'BEBIDA',
      station: 'barra',
    });

    const payload = useCartStore.getState().getCartPayload();
    const item = payload.items[0];
    expect(item.productId).toBe('p16');
    expect(item.name).toBe('Sake Copa');
    expect(item.unitPrice).toBe(8.0);
    expect(item.courseType).toBe('BEBIDA');
    expect(item.station).toBe('barra');
    expect(item.quantity).toBe(1);
  });
});

describe('createOrder (demo mode)', () => {
  it('creates order with station on items', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 2,
      items: [
        { productId: 'p1', name: 'Dragon Roll', unitPrice: 18.5, courseType: 'PLATO_FUERTE', station: 'sushi', quantity: 1 },
        { productId: 'p16', name: 'Sake Copa', unitPrice: 8.0, courseType: 'BEBIDA', station: 'barra', quantity: 2 },
      ],
    });

    expect(order).not.toBeNull();
    expect(order!.id).toMatch(/^demo_/);
    expect(order!.status).toBe('OPEN');
    expect(order!.tableId).toBe('t1');
    expect(order!.items).toHaveLength(2);

    // CRITICAL: station must be preserved on items
    const sushiItem = order!.items.find((i) => i.name === 'Dragon Roll');
    const barItem = order!.items.find((i) => i.name === 'Sake Copa');
    expect(sushiItem?.station).toBe('sushi');
    expect(barItem?.station).toBe('barra');
  });

  it('persists demo order to localStorage', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't5',
      type: 'DINE_IN',
      guestCount: 1,
      items: [
        { productId: 'p12', name: 'Teriyaki Chicken', unitPrice: 20, courseType: 'PLATO_FUERTE', station: 'cocina-caliente', quantity: 1 },
      ],
    });

    const stored = localStorage.getItem('makiavelo-demo-orders');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(order!.id);
    expect(parsed[0].items[0].station).toBe('cocina-caliente');
  });

  it('adds order to activeOrders', async () => {
    const store = useOrdersStore.getState();
    await store.createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 1,
      items: [
        { productId: 'p7', name: 'Edamame', unitPrice: 8, courseType: 'ENTRADA', station: 'cocina-fria', quantity: 1 },
      ],
    });

    const { activeOrders } = useOrdersStore.getState();
    expect(activeOrders).toHaveLength(1);
    expect(activeOrders[0].status).toBe('OPEN');
  });
});

describe('sendToKitchen (demo mode)', () => {
  it('changes order status to IN_PROGRESS', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 1,
      items: [
        { productId: 'p1', name: 'Dragon Roll', unitPrice: 18.5, courseType: 'PLATO_FUERTE', station: 'sushi', quantity: 1 },
      ],
    });

    await useOrdersStore.getState().sendToKitchen(order!.id);

    const { activeOrders } = useOrdersStore.getState();
    const updated = activeOrders.find((o) => o.id === order!.id);
    expect(updated?.status).toBe('IN_PROGRESS');
  });

  it('persists IN_PROGRESS status to localStorage', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't3',
      type: 'DINE_IN',
      guestCount: 2,
      items: [
        { productId: 'p10', name: 'Miso Soup', unitPrice: 6.5, courseType: 'ENTRADA', station: 'cocina-caliente', quantity: 1 },
      ],
    });

    await useOrdersStore.getState().sendToKitchen(order!.id);

    const stored = JSON.parse(localStorage.getItem('makiavelo-demo-orders')!);
    const savedOrder = stored.find((o: any) => o.id === order!.id);
    expect(savedOrder.status).toBe('IN_PROGRESS');
  });
});

describe('updateOrderStatus (demo mode)', () => {
  it('updates status to CLOSED and removes from activeOrders', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 1,
      items: [
        { productId: 'p1', name: 'Test', unitPrice: 10, courseType: 'PLATO_FUERTE', quantity: 1 },
      ],
    });

    await useOrdersStore.getState().sendToKitchen(order!.id);
    await useOrdersStore.getState().updateOrderStatus(order!.id, 'CLOSED');

    // In demo mode, CLOSED orders are REMOVED from activeOrders
    const { activeOrders, orders } = useOrdersStore.getState();
    const inActive = activeOrders.find((o) => o.id === order!.id);
    expect(inActive).toBeUndefined();

    // But status is updated in the orders array
    const inOrders = orders.find((o) => o.id === order!.id);
    expect(inOrders?.status).toBe('CLOSED');
  });

  it('CLOSED orders are excluded from IN_PROGRESS filter', async () => {
    const store = useOrdersStore.getState();
    const order = await store.createOrder({
      tableId: 't1',
      type: 'DINE_IN',
      guestCount: 1,
      items: [
        { productId: 'p1', name: 'Test', unitPrice: 10, courseType: 'PLATO_FUERTE', quantity: 1 },
      ],
    });

    await useOrdersStore.getState().sendToKitchen(order!.id);
    await useOrdersStore.getState().updateOrderStatus(order!.id, 'CLOSED');

    const { activeOrders } = useOrdersStore.getState();
    const inProgressOrders = activeOrders.filter(
      (o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN'
    );
    expect(inProgressOrders).toHaveLength(0);
  });
});
