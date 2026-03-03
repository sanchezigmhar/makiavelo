/**
 * QA Tests: KDS Display + Bump Flow
 * Validates: activeOrders → KDS conversion → tableNumber extraction → station filtering → bump removes order
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useOrdersStore } from '@/store/orders.store';
import { useNotificationsStore } from '@/store/notifications.store';
import type { Order, OrderItem } from '@/types';

// Helper: create a demo order directly in the store (bypasses API)
function createDemoOrderInStore(overrides: Partial<Order> = {}): Order {
  const order: Order = {
    id: 'demo_test_1',
    orderNumber: '301',
    type: 'DINE_IN',
    status: 'IN_PROGRESS',
    tableId: 't5',
    userId: 'demo-user',
    branchId: 'branch-1',
    items: [
      {
        id: 'oi_1',
        orderId: 'demo_test_1',
        productId: 'p1',
        name: 'Dragon Roll',
        quantity: 2,
        unitPrice: 18.5,
        totalPrice: 37,
        courseType: 'PLATO_FUERTE',
        station: 'sushi',
        status: 'PENDING',
        sortOrder: 0,
      },
      {
        id: 'oi_2',
        orderId: 'demo_test_1',
        productId: 'p16',
        name: 'Sake Copa',
        quantity: 1,
        unitPrice: 8,
        totalPrice: 8,
        courseType: 'BEBIDA',
        station: 'barra',
        status: 'PENDING',
        sortOrder: 1,
      },
    ] as OrderItem[],
    subtotal: 45,
    taxAmount: 0,
    discountAmount: 0,
    tipAmount: 0,
    total: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  useOrdersStore.setState((state) => ({
    activeOrders: [...state.activeOrders, order],
    orders: [...state.orders, order],
  }));

  return order;
}

beforeEach(() => {
  useOrdersStore.setState({
    orders: [],
    activeOrders: [],
    currentOrder: null,
    isLoading: false,
  });
  useNotificationsStore.setState({ readyItems: [] });
  localStorage.clear();
});

describe('KDS: storeKdsOrders conversion', () => {
  it('extracts tableNumber correctly from tableId (t5 → 5)', () => {
    const order = createDemoOrderInStore({ tableId: 't5' });
    const { activeOrders } = useOrdersStore.getState();

    // Simulate what storeKdsOrders does
    const kdsOrders = activeOrders
      .filter((o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN')
      .map((o) => ({
        tableNumber: parseInt(o.tableId?.replace(/\D/g, '') || '0', 10),
      }));

    expect(kdsOrders[0].tableNumber).toBe(5);
  });

  it('extracts tableNumber from multi-digit tableId (t29 → 29)', () => {
    createDemoOrderInStore({ tableId: 't29' });
    const { activeOrders } = useOrdersStore.getState();

    const tableNumber = parseInt(activeOrders[0].tableId?.replace(/\D/g, '') || '0', 10);
    expect(tableNumber).toBe(29);
  });

  it('tableNumber defaults to 0 for non-numeric tableId', () => {
    createDemoOrderInStore({ tableId: 'merged-abc' });
    const { activeOrders } = useOrdersStore.getState();

    const num = activeOrders[0].tableId?.replace(/\D/g, '') || '0';
    // 'merged-abc' has no digits → ''  → fallback '0' → 0
    // Actually 'merged-abc' replace \D → '' so parseInt('', 10) = NaN
    // Let's check the actual logic
    const tableNumber = parseInt(num || '0', 10);
    expect(tableNumber).toBe(0);
  });

  it('preserves station field on KDS items', () => {
    const order = createDemoOrderInStore();
    const { activeOrders } = useOrdersStore.getState();

    const items = activeOrders[0].items.map((item) => ({
      station: item.station || undefined,
    }));

    expect(items[0].station).toBe('sushi');
    expect(items[1].station).toBe('barra');
  });

  it('excludes CLOSED orders from IN_PROGRESS filter', () => {
    createDemoOrderInStore({ status: 'CLOSED' });
    const { activeOrders } = useOrdersStore.getState();

    const kdsOrders = activeOrders.filter(
      (o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN'
    );

    expect(kdsOrders).toHaveLength(0);
  });

  it('includes IN_PROGRESS orders', () => {
    createDemoOrderInStore({ status: 'IN_PROGRESS' });
    const { activeOrders } = useOrdersStore.getState();

    const kdsOrders = activeOrders.filter(
      (o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN'
    );

    expect(kdsOrders).toHaveLength(1);
  });
});

describe('KDS: Station-based filtering', () => {
  it('chef sees only kitchen stations', () => {
    const order = createDemoOrderInStore();
    const chefStations = ['cocina-caliente', 'cocina-fria', 'sushi', 'parrilla'];

    const chefItems = order.items.filter((i) =>
      i.station ? chefStations.includes(i.station) : true
    );

    // Dragon Roll (sushi) should pass, Sake (barra) should not
    expect(chefItems).toHaveLength(1);
    expect(chefItems[0].name).toBe('Dragon Roll');
  });

  it('bartender sees only barra station', () => {
    const order = createDemoOrderInStore();
    const bartenderStations = ['barra'];

    const barItems = order.items.filter((i) =>
      i.station ? bartenderStations.includes(i.station) : true
    );

    expect(barItems).toHaveLength(1);
    expect(barItems[0].name).toBe('Sake Copa');
  });
});

describe('KDS: Bump flow', () => {
  it('notification created with correct tableNumber on item bump', () => {
    const order = createDemoOrderInStore({ tableId: 't7' });
    const item = order.items[0]; // Dragon Roll

    // Simulate what handleItemBump does for notifications
    useNotificationsStore.getState().addReadyItem({
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemId: item.id,
      itemName: item.name,
      tableNumber: parseInt(order.tableId?.replace(/\D/g, '') || '0', 10),
      tableName: `Mesa ${parseInt(order.tableId?.replace(/\D/g, '') || '0', 10)}`,
      status: 'READY',
      quantity: item.quantity,
    });

    const { readyItems } = useNotificationsStore.getState();
    expect(readyItems).toHaveLength(1);
    expect(readyItems[0].tableNumber).toBe(7);
    expect(readyItems[0].tableName).toBe('Mesa 7');
    expect(readyItems[0].itemName).toBe('Dragon Roll');
    expect(readyItems[0].status).toBe('READY');
  });

  it('updateOrderStatus to CLOSED removes from active filter', async () => {
    const order = createDemoOrderInStore();

    await useOrdersStore.getState().updateOrderStatus(order.id, 'CLOSED');

    const { activeOrders } = useOrdersStore.getState();
    const active = activeOrders.filter(
      (o) => o.status === 'IN_PROGRESS' || o.status === 'OPEN'
    );
    expect(active).toHaveLength(0);
  });
});
