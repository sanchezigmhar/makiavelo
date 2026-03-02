import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderStatus, TableStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    // Validate order exists and is payable
    const order = await this.prisma.order.findUnique({
      where: { id: createPaymentDto.orderId },
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

    // Validate cash session if provided
    if (createPaymentDto.cashSessionId) {
      const session = await this.prisma.cashSession.findUnique({
        where: { id: createPaymentDto.cashSessionId },
      });

      if (!session) {
        throw new NotFoundException('Sesion de caja no encontrada');
      }

      if (session.status !== 'OPEN') {
        throw new BadRequestException('La sesion de caja no esta abierta');
      }
    }

    // Create the payment
    const payment = await this.prisma.payment.create({
      data: {
        orderId: createPaymentDto.orderId,
        cashSessionId: createPaymentDto.cashSessionId,
        method: createPaymentDto.method,
        amount: createPaymentDto.amount,
        tip: createPaymentDto.tip || 0,
        reference: createPaymentDto.reference,
        notes: createPaymentDto.notes,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
        cashSession: {
          select: { id: true, cashRegister: true },
        },
      },
    });

    // Check if order is fully paid and close it
    const totalPaid =
      order.payments.reduce((sum, p) => sum + p.amount, 0) +
      createPaymentDto.amount;

    if (totalPaid >= order.total) {
      await this.prisma.order.update({
        where: { id: order.id },
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

    return payment;
  }

  async findByOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
        cashSession: {
          select: {
            id: true,
            cashRegister: true,
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalPaid = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalTips = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.tip, 0);

    return {
      payments,
      summary: {
        totalPaid,
        totalTips,
        orderTotal: order.total,
        remaining: Math.max(0, order.total - totalPaid),
        isFullyPaid: totalPaid >= order.total,
      },
    };
  }

  async findBySession(sessionId: string) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sesion de caja no encontrada');
    }

    const payments = await this.prisma.payment.findMany({
      where: { cashSessionId: sessionId },
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Summarize by method
    const byMethod: Record<string, { count: number; total: number; tips: number }> = {};
    let totalAmount = 0;
    let totalTips = 0;

    payments
      .filter((p) => p.status === 'COMPLETED')
      .forEach((payment) => {
        const method = payment.method;
        if (!byMethod[method]) {
          byMethod[method] = { count: 0, total: 0, tips: 0 };
        }
        byMethod[method].count++;
        byMethod[method].total += payment.amount;
        byMethod[method].tips += payment.tip;
        totalAmount += payment.amount;
        totalTips += payment.tip;
      });

    return {
      payments,
      summary: {
        totalAmount,
        totalTips,
        transactionCount: payments.length,
        byMethod,
      },
    };
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
        cashSession: {
          select: { id: true, cashRegister: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }
}
