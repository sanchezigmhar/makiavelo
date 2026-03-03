/**
 * QA Tests: Notification Flow (KDS → Mesas)
 * Validates: addReadyItem → localStorage → mesa color match → markDelivered
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationsStore } from '@/store/notifications.store';

beforeEach(() => {
  useNotificationsStore.setState({ readyItems: [] });
  localStorage.clear();
});

describe('Notifications: addReadyItem', () => {
  it('creates notification with tableNumber and tableName', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 5,
      tableName: 'Mesa 5',
      status: 'READY',
      quantity: 2,
    });

    const { readyItems } = useNotificationsStore.getState();
    expect(readyItems).toHaveLength(1);
    expect(readyItems[0].tableNumber).toBe(5);
    expect(readyItems[0].tableName).toBe('Mesa 5');
    expect(readyItems[0].itemName).toBe('Dragon Roll');
    expect(readyItems[0].status).toBe('READY');
    expect(readyItems[0].quantity).toBe(2);
    expect(readyItems[0].id).toMatch(/^notif-/);
    expect(readyItems[0].timestamp).toBeGreaterThan(0);
  });

  it('prevents duplicate notifications (same itemId + orderId)', () => {
    const notifData = {
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 5,
      tableName: 'Mesa 5',
      status: 'READY' as const,
      quantity: 1,
    };

    useNotificationsStore.getState().addReadyItem(notifData);
    useNotificationsStore.getState().addReadyItem(notifData); // duplicate

    const { readyItems } = useNotificationsStore.getState();
    expect(readyItems).toHaveLength(1);
  });

  it('persists to localStorage', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Sake Copa',
      tableNumber: 3,
      tableName: 'Mesa 3',
      status: 'READY',
      quantity: 1,
    });

    const stored = localStorage.getItem('makiavelo-ready-notifications');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].itemName).toBe('Sake Copa');
    expect(parsed[0].tableNumber).toBe(3);
  });
});

describe('Notifications: markDelivered', () => {
  it('changes notification status to DELIVERED', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 5,
      tableName: 'Mesa 5',
      status: 'READY',
      quantity: 1,
    });

    useNotificationsStore.getState().markDelivered('oi_1');

    const { readyItems } = useNotificationsStore.getState();
    expect(readyItems[0].status).toBe('DELIVERED');
  });

  it('persists DELIVERED status to localStorage', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Test',
      tableNumber: 1,
      tableName: 'Mesa 1',
      status: 'READY',
      quantity: 1,
    });

    useNotificationsStore.getState().markDelivered('oi_1');

    const stored = JSON.parse(localStorage.getItem('makiavelo-ready-notifications')!);
    expect(stored[0].status).toBe('DELIVERED');
  });
});

describe('Mesa color: notification matching', () => {
  // Simulates the colorOverride logic from mesas/page.tsx
  function shouldMesaBeFuchsia(
    tableNumber: number,
    tableName: string,
    readyItems: { status: string; tableNumber?: number; tableName?: string }[]
  ): boolean {
    return readyItems.some(
      (n) =>
        n.status === 'READY' &&
        (n.tableNumber === tableNumber || n.tableName === tableName)
    );
  }

  it('mesa is fuchsia when READY notification matches tableNumber', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 1,
      tableName: 'Mesa 1',
      status: 'READY',
      quantity: 1,
    });

    const { readyItems } = useNotificationsStore.getState();
    expect(shouldMesaBeFuchsia(1, 'Mesa 1', readyItems)).toBe(true);
  });

  it('mesa is NOT fuchsia when notification is DELIVERED', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 1,
      tableName: 'Mesa 1',
      status: 'READY',
      quantity: 1,
    });

    useNotificationsStore.getState().markDelivered('oi_1');

    const { readyItems } = useNotificationsStore.getState();
    expect(shouldMesaBeFuchsia(1, 'Mesa 1', readyItems)).toBe(false);
  });

  it('mesa matches by tableName as fallback', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Edamame',
      tableNumber: 0, // tableNumber is wrong/0
      tableName: 'Mesa 8',
      status: 'READY',
      quantity: 1,
    });

    const { readyItems } = useNotificationsStore.getState();
    // Should NOT match by tableNumber (0 !== 8)
    // Should match by tableName ('Mesa 8' === 'Mesa 8')
    expect(shouldMesaBeFuchsia(8, 'Mesa 8', readyItems)).toBe(true);
  });

  it('mesa does NOT match different table', () => {
    useNotificationsStore.getState().addReadyItem({
      orderId: 'demo_1',
      orderNumber: '301',
      itemId: 'oi_1',
      itemName: 'Dragon Roll',
      tableNumber: 5,
      tableName: 'Mesa 5',
      status: 'READY',
      quantity: 1,
    });

    const { readyItems } = useNotificationsStore.getState();
    expect(shouldMesaBeFuchsia(3, 'Mesa 3', readyItems)).toBe(false);
  });

  it('multiple ready items for same mesa shows correct count', () => {
    const store = useNotificationsStore.getState();
    store.addReadyItem({
      orderId: 'demo_1', orderNumber: '301',
      itemId: 'oi_1', itemName: 'Dragon Roll',
      tableNumber: 1, tableName: 'Mesa 1',
      status: 'READY', quantity: 2,
    });
    store.addReadyItem({
      orderId: 'demo_1', orderNumber: '301',
      itemId: 'oi_2', itemName: 'Edamame',
      tableNumber: 1, tableName: 'Mesa 1',
      status: 'READY', quantity: 1,
    });

    const { readyItems } = useNotificationsStore.getState();
    const readyCount = readyItems.filter(
      (n) => n.status === 'READY' && (n.tableNumber === 1 || n.tableName === 'Mesa 1')
    ).length;

    expect(readyCount).toBe(2);
  });
});
