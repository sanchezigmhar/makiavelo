import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import {
  AddItemsDto,
  ApplyDiscountDto,
  PayOrderDto,
  CancelOrderDto,
  CancelItemDto,
  SplitOrderDto,
} from './dto/update-order.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { OrderStatus, OrderItemStatus, TableStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const lastOrder = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop(), 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const orderNumber = await this.generateOrderNumber();

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        type: createOrderDto.type || 'DINE_IN',
        tableId: createOrderDto.tableId,
        branchId: createOrderDto.branchId,
        userId,
        customerId: createOrderDto.customerId,
        guestCount: createOrderDto.guestCount || 1,
        notes: createOrderDto.notes,
      },
    });

    // Add items if provided
    if (createOrderDto.items && createOrderDto.items.length > 0) {
      await this.addItemsToOrder(order.id, createOrderDto.items);
    }

    // Update table status if dine-in
    if (createOrderDto.tableId) {
      await this.prisma.table.update({
        where: { id: createOrderDto.tableId },
        data: { status: TableStatus.OCCUPIED },
      });
    }

    return this.findOne(order.id);
  }

  private async addItemsToOrder(orderId: string, items: CreateOrderItemDto[]) {
    for (const item of items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no encontrado`);
      }

      const quantity = item.quantity || 1;
      const unitPrice = product.price;
      let subtotal = unitPrice * quantity;

      // Calculate modifier prices
      let modifierTotal = 0;
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          const option = await this.prisma.modifierOption.findUnique({
            where: { id: mod.modifierOptionId },
          });
          if (option) {
            modifierTotal += option.price;
          }
        }
      }

      subtotal += modifierTotal * quantity;

      const orderItem = await this.prisma.orderItem.create({
        data: {
          orderId,
          productId: item.productId,
          quantity,
          unitPrice: unitPrice + modifierTotal,
          subtotal,
          notes: item.notes,
          station: product.station,
          seat: item.seat,
        },
      });

      // Add modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          const option = await this.prisma.modifierOption.findUnique({
            where: { id: mod.modifierOptionId },
          });

          await this.prisma.orderItemModifier.create({
            data: {
              orderItemId: orderItem.id,
              modifierOptionId: mod.modifierOptionId,
              price: option?.price || 0,
            },
          });
        }
      }
    }

    // Recalculate order totals
    await this.recalculateOrderTotals(orderId);
  }

  private async recalculateOrderTotals(orderId: string) {
    const orderItems = await this.prisma.orderItem.findMany({
      where: { orderId, status: { not: OrderItemStatus.CANCELLED } },
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    let discountAmount = 0;
    if (order.discountType === 'percentage') {
      discountAmount = subtotal * (order.discountValue / 100);
    } else if (order.discountType === 'fixed') {
      discountAmount = order.discountValue;
    }

    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * 0.16; // 16% IVA
    const total = taxableAmount + tax;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        discountAmount,
        tax,
        total: Math.max(0, total),
      },
    });
  }

  async addItems(orderId: string, addItemsDto: AddItemsDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.CLOSED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se pueden agregar items a una orden cerrada o cancelada');
    }

    await this.addItemsToOrder(orderId, addItemsDto.items);

    // Update order status
    if (order.status === OrderStatus.OPEN) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.OPEN },
      });
    }

    return this.findOne(orderId);
  }

  async sendToKitchen(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Mark all pending items as sent to kitchen
    const now = new Date();
    await this.prisma.orderItem.updateMany({
      where: {
        orderId,
        status: OrderItemStatus.PENDING,
      },
      data: {
        status: OrderItemStatus.PREPARING,
        sentToKitchenAt: now,
      },
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.IN_PROGRESS },
    });

    return this.findOne(orderId);
  }

  async applyDiscount(orderId: string, discountDto: ApplyDiscountDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.CLOSED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se puede aplicar descuento a una orden cerrada');
    }

    if (discountDto.discountType === 'percentage' && discountDto.discountValue > 100) {
      throw new BadRequestException('El porcentaje de descuento no puede ser mayor a 100%');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        discountType: discountDto.discountType,
        discountValue: discountDto.discountValue,
      },
    });

    await this.recalculateOrderTotals(orderId);
    return this.findOne(orderId);
  }

  async payOrder(orderId: string, payDto: PayOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.CLOSED) {
      throw new BadRequestException('Esta orden ya esta cerrada');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('No se puede pagar una orden cancelada');
    }

    // Create payment
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        cashSessionId: payDto.cashSessionId,
        method: payDto.method,
        amount: payDto.amount,
        tip: payDto.tip || 0,
        reference: payDto.reference,
        notes: payDto.notes,
      },
    });

    // Check if fully paid
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0) + payDto.amount;

    if (totalPaid >= order.total) {
      // Close the order
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      // Free the table
      if (order.tableId) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.CLEANING },
        });
      }

      // Update customer stats
      if (order.customerId) {
        await this.prisma.customer.update({
          where: { id: order.customerId },
          data: {
            totalVisits: { increment: 1 },
            totalSpent: { increment: order.total },
          },
        });
      }
    }

    return this.findOne(orderId);
  }

  async closeOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid < order.total) {
      throw new BadRequestException(
        `Falta por pagar $${(order.total - totalPaid).toFixed(2)}`,
      );
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    if (order.tableId) {
      await this.prisma.table.update({
        where: { id: order.tableId },
        data: { status: TableStatus.CLEANING },
      });
    }

    return this.findOne(orderId);
  }

  async cancelOrder(orderId: string, cancelDto: CancelOrderDto) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    if (order.status === OrderStatus.CLOSED) {
      throw new BadRequestException('No se puede cancelar una orden cerrada');
    }

    // Cancel all items
    await this.prisma.orderItem.updateMany({
      where: {
        orderId,
        status: { not: OrderItemStatus.CANCELLED },
      },
      data: {
        status: OrderItemStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: cancelDto.reason,
      },
    });

    // Cancel order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        closedAt: new Date(),
        notes: cancelDto.reason
          ? `${order.notes || ''} [CANCELADO: ${cancelDto.reason}]`
          : order.notes,
      },
    });

    // Free the table
    if (order.tableId) {
      // Check if there are other active orders on this table
      const otherOrders = await this.prisma.order.count({
        where: {
          tableId: order.tableId,
          status: { in: [OrderStatus.OPEN, OrderStatus.IN_PROGRESS] },
          id: { not: orderId },
        },
      });

      if (otherOrders === 0) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE },
        });
      }
    }

    return this.findOne(orderId);
  }

  async cancelItem(orderId: string, itemId: string, cancelDto: CancelItemDto) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
    });

    if (!item) {
      throw new NotFoundException('Item de orden no encontrado');
    }

    if (item.status === OrderItemStatus.CANCELLED) {
      throw new BadRequestException('Este item ya esta cancelado');
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: OrderItemStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: cancelDto.reason,
      },
    });

    await this.recalculateOrderTotals(orderId);
    return this.findOne(orderId);
  }

  async splitOrder(orderId: string, userId: string, splitDto: SplitOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Create new order with the split items
    const newOrderNumber = await this.generateOrderNumber();

    const newOrder = await this.prisma.order.create({
      data: {
        orderNumber: newOrderNumber,
        type: order.type,
        tableId: splitDto.tableId || order.tableId,
        branchId: order.branchId,
        userId,
        customerId: order.customerId,
        guestCount: 1,
      },
    });

    // Move items to new order
    for (const itemId of splitDto.itemIds) {
      const item = order.items.find((i) => i.id === itemId);
      if (!item) continue;

      await this.prisma.orderItem.update({
        where: { id: itemId },
        data: { orderId: newOrder.id },
      });
    }

    // Recalculate both orders
    await this.recalculateOrderTotals(orderId);
    await this.recalculateOrderTotals(newOrder.id);

    return {
      originalOrder: await this.findOne(orderId),
      newOrder: await this.findOne(newOrder.id),
    };
  }

  async findAll(paginationDto: PaginationDto, branchId?: string, status?: string) {
    const { page, limit, skip, sortBy, sortOrder, search } = paginationDto;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          table: { include: { zone: true } },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
          customer: true,
          items: {
            include: {
              product: true,
              modifiers: { include: { modifierOption: true } },
            },
          },
          payments: true,
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findActive(branchId?: string) {
    const where: any = {
      status: { in: [OrderStatus.OPEN, OrderStatus.IN_PROGRESS, OrderStatus.READY] },
    };
    if (branchId) where.branchId = branchId;

    return this.prisma.order.findMany({
      where,
      include: {
        table: { include: { zone: true } },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        customer: true,
        items: {
          include: {
            product: true,
            modifiers: { include: { modifierOption: true } },
          },
        },
        payments: true,
      },
      orderBy: { openedAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        table: { include: { zone: true } },
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        customer: true,
        items: {
          include: {
            product: true,
            modifiers: { include: { modifierOption: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: true,
        invoices: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  async findByTable(tableId: string) {
    return this.prisma.order.findMany({
      where: {
        tableId,
        status: { in: [OrderStatus.OPEN, OrderStatus.IN_PROGRESS] },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            product: true,
            modifiers: { include: { modifierOption: true } },
          },
        },
        payments: true,
      },
      orderBy: { openedAt: 'desc' },
    });
  }
}
