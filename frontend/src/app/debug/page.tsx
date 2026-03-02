'use client';

import React, { useEffect, useState } from 'react';
import { useTablesStore } from '@/store/tables.store';
import { useOrdersStore } from '@/store/orders.store';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';

export default function DebugPage() {
  const { tables: storeTables, fetchTables, fetchZones, zones } = useTablesStore();
  const { activeOrders, fetchActiveOrders, fetchOrder, fetchOrdersByTable } = useOrdersStore();
  const { user, isAuthenticated, token } = useAuthStore();
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string>('');

  const log = (msg: string) => {
    console.log('[DEBUG]', msg);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${msg}`]);
  };

  useEffect(() => {
    log(`Auth: authenticated=${isAuthenticated} user=${user?.email} token=${token ? token.slice(0, 15) + '...' : 'null'}`);
    log(`Branch ID in localStorage: ${localStorage.getItem('maki_branch_id')}`);
  }, [isAuthenticated, user, token]);

  useEffect(() => {
    log(`StoreTables: ${storeTables.length} tables`);
    storeTables.forEach((t: any) => { // eslint-disable-line
      if (t.status !== 'AVAILABLE' || t.currentOrderId) {
        log(`  Table #${t.number} (${t.name}): status=${t.status} currentOrderId=${t.currentOrderId || 'none'} id=${t.id?.slice(0, 15)}...`);
      }
    });
  }, [storeTables]);

  useEffect(() => {
    log(`ActiveOrders: ${activeOrders.length} orders`);
    activeOrders.forEach((o) => {
      log(`  Order #${o.orderNumber}: tableId=${o.tableId?.slice(0, 15)}... status=${o.status} items=${o.items?.length}`);
    });
  }, [activeOrders]);

  const handleFetchAll = async () => {
    log('--- Fetching all data ---');
    await fetchTables();
    await fetchZones();
    await fetchActiveOrders();
    log('--- Fetch complete ---');
  };

  const handleTestVerCuenta = async () => {
    log('--- Testing Ver Cuenta flow ---');
    const occupiedTables = storeTables.filter((t) => t.status === 'OCCUPIED');
    log(`Occupied tables: ${occupiedTables.length}`);

    if (occupiedTables.length === 0) {
      setTestResult('❌ No occupied tables found. Create an order first.');
      return;
    }

    const table = occupiedTables[0];
    const tableAny = table as any; // eslint-disable-line
    log(`Testing table #${table.number}: id=${table.id?.slice(0, 15)}... currentOrderId=${tableAny.currentOrderId || 'none'}`);

    // Strategy 1: fetchOrder by ID
    if (tableAny.currentOrderId && tableAny.currentOrderId.length > 10) {
      log(`Strategy 1: fetchOrder(${tableAny.currentOrderId.slice(0, 15)}...)`);
      try {
        const order = await fetchOrder(tableAny.currentOrderId);
        if (order) {
          log(`  Result: order #${order.orderNumber}, items=${order.items?.length}, status=${order.status}`);
          if (order.items && order.items.length > 0) {
            order.items.forEach((item: any) => { // eslint-disable-line
              const name = item.name || item.product?.name || item.productId;
              log(`    ${item.quantity}x ${name} @ $${item.unitPrice}`);
            });
            setTestResult(`✅ Strategy 1 works! Order #${order.orderNumber} with ${order.items.length} items`);
            return;
          }
        } else {
          log('  Result: null (order not found)');
        }
      } catch (err: any) { // eslint-disable-line
        log(`  Error: ${err.message}`);
      }
    } else {
      log('Strategy 1: skipped (no valid currentOrderId)');
    }

    // Strategy 2: fetchOrdersByTable
    log(`Strategy 2: fetchOrdersByTable(${table.id?.slice(0, 15)}...)`);
    try {
      const orders = await fetchOrdersByTable(table.id);
      log(`  Result: ${orders.length} orders`);
      if (orders.length > 0) {
        const order = orders[0];
        log(`  Order #${order.orderNumber}: items=${order.items?.length}`);
        setTestResult(`✅ Strategy 2 works! Order #${order.orderNumber}`);
        return;
      }
    } catch (err: any) { // eslint-disable-line
      log(`  Error: ${err.message}`);
    }

    // Strategy 3: memory
    log(`Strategy 3: activeOrders in memory (${activeOrders.length})`);
    const memOrder = activeOrders.find((o) => o.tableId === table.id);
    if (memOrder) {
      log(`  Found: order #${memOrder.orderNumber}`);
      setTestResult(`✅ Strategy 3 works! Order #${memOrder.orderNumber}`);
      return;
    }

    setTestResult('❌ All strategies failed!');
  };

  const handleRawApiTest = async () => {
    log('--- Raw API test ---');
    try {
      const { data: tablesData } = await api.get('/tables');
      const tables = Array.isArray(tablesData) ? tablesData : [];
      log(`Raw /tables: ${tables.length} tables`);
      tables.forEach((t: any) => { // eslint-disable-line
        const orders = t.orders || [];
        if (t.status !== 'AVAILABLE' || orders.length > 0) {
          log(`  #${t.number}: status=${t.status} orders=${orders.length} id=${t.id?.slice(0, 15)}...`);
          orders.forEach((o: any) => { // eslint-disable-line
            log(`    Order #${o.orderNumber}: status=${o.status} items=${o.items?.length}`);
          });
        }
      });
    } catch (err: any) { // eslint-disable-line
      log(`Raw API error: ${err.message}`);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto font-mono text-sm">
      <h1 className="text-xl font-bold mb-4">🔧 MakiCore Debug</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={handleFetchAll} className="px-3 py-1.5 bg-blue-500 text-white rounded">
          Fetch All Data
        </button>
        <button onClick={handleTestVerCuenta} className="px-3 py-1.5 bg-green-500 text-white rounded">
          Test Ver Cuenta
        </button>
        <button onClick={handleRawApiTest} className="px-3 py-1.5 bg-purple-500 text-white rounded">
          Raw API Test
        </button>
      </div>

      {testResult && (
        <div className={`p-3 rounded mb-4 ${testResult.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {testResult}
        </div>
      )}

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-[70vh]">
        {debugLog.map((line, i) => (
          <div key={i} className="py-0.5">{line}</div>
        ))}
        {debugLog.length === 0 && <div className="text-gray-500">No logs yet. Click a button above.</div>}
      </div>
    </div>
  );
}
