import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailySales(branchId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'CLOSED',
        closedAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        payments: { where: { status: 'COMPLETED' } },
        items: {
          where: { status: { not: 'CANCELLED' } },
          include: { product: true },
        },
      },
    });

    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
    const totalDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);

    // Payment breakdown
    const paymentBreakdown: Record<string, { count: number; total: number; tips: number }> = {};
    orders.forEach((order) => {
      order.payments.forEach((payment) => {
        if (!paymentBreakdown[payment.method]) {
          paymentBreakdown[payment.method] = { count: 0, total: 0, tips: 0 };
        }
        paymentBreakdown[payment.method].count++;
        paymentBreakdown[payment.method].total += payment.amount;
        paymentBreakdown[payment.method].tips += payment.tip;
      });
    });

    const totalTips = Object.values(paymentBreakdown).reduce((sum, p) => sum + p.tips, 0);

    // Order type breakdown
    const orderTypeBreakdown: Record<string, { count: number; total: number }> = {};
    orders.forEach((order) => {
      if (!orderTypeBreakdown[order.type]) {
        orderTypeBreakdown[order.type] = { count: 0, total: 0 };
      }
      orderTypeBreakdown[order.type].count++;
      orderTypeBreakdown[order.type].total += order.total;
    });

    // Average ticket
    const avgTicket = orders.length > 0 ? totalSales / orders.length : 0;

    // Total guests
    const totalGuests = orders.reduce((sum, o) => sum + o.guestCount, 0);
    const avgPerGuest = totalGuests > 0 ? totalSales / totalGuests : 0;

    return {
      date: startOfDay.toISOString().split('T')[0],
      orderCount: orders.length,
      totalSales,
      totalSubtotal,
      totalTax,
      totalDiscount,
      totalTips,
      avgTicket,
      totalGuests,
      avgPerGuest,
      paymentBreakdown,
      orderTypeBreakdown,
    };
  }

  async getSalesByProduct(branchId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 1);

    const items = await this.prisma.orderItem.findMany({
      where: {
        status: { not: 'CANCELLED' },
        order: {
          branchId,
          status: 'CLOSED',
          closedAt: {
            gte: start,
            lt: end,
          },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    // Group by product
    const productSales: Record<string, any> = {};
    items.forEach((item) => {
      const key = item.productId;
      if (!productSales[key]) {
        productSales[key] = {
          productId: item.product.id,
          productName: item.product.name,
          categoryName: item.product.category?.name,
          quantitySold: 0,
          totalRevenue: 0,
          avgPrice: 0,
        };
      }
      productSales[key].quantitySold += item.quantity;
      productSales[key].totalRevenue += item.subtotal;
    });

    // Calculate averages and sort
    const result = Object.values(productSales)
      .map((p: any) => ({
        ...p,
        avgPrice: p.totalRevenue / p.quantitySold,
      }))
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    return result;
  }

  async getSalesByCategory(branchId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 30));
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 1);

    const items = await this.prisma.orderItem.findMany({
      where: {
        status: { not: 'CANCELLED' },
        order: {
          branchId,
          status: 'CLOSED',
          closedAt: {
            gte: start,
            lt: end,
          },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const categorySales: Record<string, any> = {};
    items.forEach((item) => {
      const catName = item.product.category?.name || 'Sin categoria';
      if (!categorySales[catName]) {
        categorySales[catName] = {
          category: catName,
          itemCount: 0,
          totalRevenue: 0,
        };
      }
      categorySales[catName].itemCount += item.quantity;
      categorySales[catName].totalRevenue += item.subtotal;
    });

    return Object.values(categorySales).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
  }

  async getDashboardKPIs(branchId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Today's sales
    const todayOrders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'CLOSED',
        closedAt: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        payments: { where: { status: 'COMPLETED' } },
      },
    });

    const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayOrderCount = todayOrders.length;
    const todayAvgTicket = todayOrderCount > 0 ? todaySales / todayOrderCount : 0;

    // Active orders
    const activeOrders = await this.prisma.order.count({
      where: {
        branchId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    // Tables status
    const tables = await this.prisma.table.findMany({
      where: { zone: { branchId }, isActive: true },
      select: { status: true },
    });

    const tableStats = {
      total: tables.length,
      available: tables.filter((t) => t.status === 'AVAILABLE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
    };

    const occupancyRate = tableStats.total > 0
      ? (tableStats.occupied / tableStats.total) * 100
      : 0;

    // Today's reservations
    const todayReservations = await this.prisma.reservation.count({
      where: {
        branchId,
        reservationDate: { gte: startOfDay, lt: endOfDay },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    // KDS items pending
    const kdsPending = await this.prisma.orderItem.count({
      where: {
        status: 'PREPARING',
        order: { branchId, status: 'IN_PROGRESS' },
      },
    });

    // Low stock alerts
    const supplies = await this.prisma.supply.findMany({
      where: { isActive: true },
    });
    const lowStockCount = supplies.filter((s) => s.currentStock <= s.minStock).length;

    // Yesterday comparison
    const yesterday = new Date(startOfDay);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayOrders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'CLOSED',
        closedAt: { gte: yesterday, lt: startOfDay },
      },
    });

    const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
    const salesGrowth = yesterdaySales > 0
      ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
      : 0;

    return {
      today: {
        sales: todaySales,
        orderCount: todayOrderCount,
        avgTicket: todayAvgTicket,
        salesGrowth,
      },
      live: {
        activeOrders,
        tableStats,
        occupancyRate,
        todayReservations,
        kdsPending,
        lowStockCount,
      },
    };
  }

  async getSalesTimeline(branchId: string, days: number = 7) {
    const timeline = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const orders = await this.prisma.order.findMany({
        where: {
          branchId,
          status: 'CLOSED',
          closedAt: { gte: startOfDay, lt: endOfDay },
        },
      });

      timeline.push({
        date: startOfDay.toISOString().split('T')[0],
        sales: orders.reduce((sum, o) => sum + o.total, 0),
        orderCount: orders.length,
      });
    }

    return timeline;
  }

  async getServerPerformance(branchId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: 'CLOSED',
        closedAt: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        payments: { where: { status: 'COMPLETED' } },
      },
    });

    const serverStats: Record<string, any> = {};
    orders.forEach((order) => {
      const key = order.userId;
      if (!serverStats[key]) {
        serverStats[key] = {
          userId: order.user.id,
          name: `${order.user.firstName} ${order.user.lastName}`,
          orderCount: 0,
          totalSales: 0,
          totalTips: 0,
        };
      }
      serverStats[key].orderCount++;
      serverStats[key].totalSales += order.total;
      order.payments.forEach((p) => {
        serverStats[key].totalTips += p.tip;
      });
    });

    return Object.values(serverStats)
      .map((s: any) => ({
        ...s,
        avgTicket: s.totalSales / s.orderCount,
      }))
      .sort((a: any, b: any) => b.totalSales - a.totalSales);
  }
}
