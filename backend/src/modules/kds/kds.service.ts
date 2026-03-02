import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderItemStatus } from '@prisma/client';

@Injectable()
export class KdsService {
  constructor(private prisma: PrismaService) {}

  async getItemsByStation(station: string, branchId?: string) {
    const where: any = {
      station,
      status: { in: [OrderItemStatus.PREPARING] },
      order: {
        status: { in: ['IN_PROGRESS'] },
      },
    };

    if (branchId) {
      where.order.branchId = branchId;
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      include: {
        product: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            type: true,
            table: {
              select: { id: true, number: true, name: true, zone: { select: { name: true } } },
            },
            openedAt: true,
            guestCount: true,
          },
        },
        modifiers: {
          include: { modifierOption: true },
        },
      },
      orderBy: { sentToKitchenAt: 'asc' },
    });

    return items;
  }

  async getAllPendingItems(branchId?: string) {
    const where: any = {
      status: { in: [OrderItemStatus.PREPARING] },
      order: {
        status: { in: ['IN_PROGRESS'] },
      },
    };

    if (branchId) {
      where.order.branchId = branchId;
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      include: {
        product: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            type: true,
            table: {
              select: { id: true, number: true, name: true, zone: { select: { name: true } } },
            },
            openedAt: true,
          },
        },
        modifiers: {
          include: { modifierOption: true },
        },
      },
      orderBy: { sentToKitchenAt: 'asc' },
    });

    // Group by station
    const grouped: Record<string, typeof items> = {};
    items.forEach((item) => {
      const station = item.station || 'sin-estacion';
      if (!grouped[station]) grouped[station] = [];
      grouped[station].push(item);
    });

    return grouped;
  }

  async bumpItem(itemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    const updatedItem = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.READY,
        preparedAt: new Date(),
      },
      include: {
        product: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            table: {
              select: { id: true, number: true, name: true },
            },
          },
        },
      },
    });

    // Check if all items in the order are ready
    const pendingItems = await this.prisma.orderItem.count({
      where: {
        orderId: item.orderId,
        status: { in: [OrderItemStatus.PENDING, OrderItemStatus.PREPARING] },
      },
    });

    if (pendingItems === 0) {
      await this.prisma.order.update({
        where: { id: item.orderId },
        data: { status: 'READY' },
      });
    }

    return updatedItem;
  }

  async markDelivered(itemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.DELIVERED,
        deliveredAt: new Date(),
      },
      include: {
        product: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            table: {
              select: { id: true, number: true, name: true },
            },
          },
        },
      },
    });
  }

  async recallItem(itemId: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Item no encontrado');
    }

    return this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.PREPARING,
        preparedAt: null,
      },
      include: {
        product: true,
        order: {
          select: { id: true, orderNumber: true },
        },
      },
    });
  }

  async getStats(branchId?: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const where: any = {
      sentToKitchenAt: { gte: startOfDay },
    };

    if (branchId) {
      where.order = { branchId };
    }

    const items = await this.prisma.orderItem.findMany({
      where,
      select: {
        status: true,
        station: true,
        sentToKitchenAt: true,
        preparedAt: true,
        deliveredAt: true,
      },
    });

    const totalItems = items.length;
    const preparing = items.filter((i) => i.status === 'PREPARING').length;
    const ready = items.filter((i) => i.status === 'READY').length;
    const delivered = items.filter((i) => i.status === 'DELIVERED').length;
    const cancelled = items.filter((i) => i.status === 'CANCELLED').length;

    // Calculate average preparation time
    const completedItems = items.filter(
      (i) => i.preparedAt && i.sentToKitchenAt,
    );

    let avgPrepTime = 0;
    if (completedItems.length > 0) {
      const totalPrepTime = completedItems.reduce((sum, item) => {
        return (
          sum +
          (new Date(item.preparedAt).getTime() -
            new Date(item.sentToKitchenAt).getTime())
        );
      }, 0);
      avgPrepTime = Math.round(totalPrepTime / completedItems.length / 60000); // in minutes
    }

    // Stats by station
    const stationStats: Record<string, any> = {};
    items.forEach((item) => {
      const station = item.station || 'sin-estacion';
      if (!stationStats[station]) {
        stationStats[station] = { total: 0, preparing: 0, ready: 0, delivered: 0 };
      }
      stationStats[station].total++;
      if (item.status === 'PREPARING') stationStats[station].preparing++;
      if (item.status === 'READY') stationStats[station].ready++;
      if (item.status === 'DELIVERED') stationStats[station].delivered++;
    });

    return {
      totalItems,
      preparing,
      ready,
      delivered,
      cancelled,
      avgPrepTimeMinutes: avgPrepTime,
      stationStats,
    };
  }
}
