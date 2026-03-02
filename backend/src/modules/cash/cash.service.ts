import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenCashSessionDto, CloseCashSessionDto } from './dto/cash-session.dto';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  async openSession(userId: string, openDto: OpenCashSessionDto) {
    // Check if there's already an open session for this register
    const existingOpen = await this.prisma.cashSession.findFirst({
      where: {
        cashRegisterId: openDto.cashRegisterId,
        status: 'OPEN',
      },
    });

    if (existingOpen) {
      throw new BadRequestException('Ya existe una sesion abierta para esta caja');
    }

    return this.prisma.cashSession.create({
      data: {
        cashRegisterId: openDto.cashRegisterId,
        shiftId: openDto.shiftId,
        userId,
        openingAmount: openDto.openingAmount,
      },
      include: {
        cashRegister: true,
        shift: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async closeSession(sessionId: string, closeDto: CloseCashSessionDto) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        payments: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Sesion de caja no encontrada');
    }

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Esta sesion ya esta cerrada');
    }

    // Calculate expected amount
    const cashPayments = session.payments
      .filter((p) => p.method === 'CASH' && p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount + p.tip, 0);

    const expectedAmount = session.openingAmount + cashPayments;
    const difference = closeDto.closingAmount - expectedAmount;

    return this.prisma.cashSession.update({
      where: { id: sessionId },
      data: {
        status: 'CLOSED',
        closingAmount: closeDto.closingAmount,
        expectedAmount,
        difference,
        notes: closeDto.notes,
        closedAt: new Date(),
      },
      include: {
        cashRegister: true,
        shift: true,
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getSessionSummary(sessionId: string) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
      include: {
        cashRegister: true,
        shift: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        payments: {
          where: { status: 'COMPLETED' },
          include: {
            order: {
              select: { id: true, orderNumber: true, total: true },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesion de caja no encontrada');
    }

    // Summarize by payment method
    const paymentsByMethod = {};
    let totalSales = 0;
    let totalTips = 0;
    let transactionCount = 0;

    session.payments.forEach((payment) => {
      const method = payment.method;
      if (!paymentsByMethod[method]) {
        paymentsByMethod[method] = { count: 0, total: 0, tips: 0 };
      }
      paymentsByMethod[method].count++;
      paymentsByMethod[method].total += payment.amount;
      paymentsByMethod[method].tips += payment.tip;
      totalSales += payment.amount;
      totalTips += payment.tip;
      transactionCount++;
    });

    return {
      session: {
        id: session.id,
        status: session.status,
        openingAmount: session.openingAmount,
        closingAmount: session.closingAmount,
        expectedAmount: session.expectedAmount,
        difference: session.difference,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        cashRegister: session.cashRegister,
        shift: session.shift,
        user: session.user,
      },
      summary: {
        totalSales,
        totalTips,
        transactionCount,
        paymentsByMethod,
      },
    };
  }

  async findActiveSessions(branchId?: string) {
    const where: any = { status: 'OPEN' };
    if (branchId) {
      where.cashRegister = { branchId };
    }

    return this.prisma.cashSession.findMany({
      where,
      include: {
        cashRegister: true,
        shift: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { payments: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findAll(branchId?: string) {
    const where: any = {};
    if (branchId) {
      where.cashRegister = { branchId };
    }

    return this.prisma.cashSession.findMany({
      where,
      include: {
        cashRegister: true,
        shift: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async getCashRegisters(branchId?: string) {
    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.cashRegister.findMany({
      where,
      include: {
        cashSessions: {
          where: { status: 'OPEN' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }
}
