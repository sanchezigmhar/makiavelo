import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto, VoidInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const prefix = `FAC-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop(), 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  async create(createInvoiceDto: CreateInvoiceDto) {
    // Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: createInvoiceDto.orderId },
      include: {
        invoices: {
          where: { status: { in: ['ISSUED', 'PAID'] } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Check if order already has an active invoice
    if (order.invoices.length > 0) {
      throw new BadRequestException('Esta orden ya tiene una factura activa');
    }

    // Get customer data if customerId provided
    let taxId = createInvoiceDto.taxId;
    let businessName = createInvoiceDto.businessName;

    if (createInvoiceDto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: createInvoiceDto.customerId },
      });

      if (!customer) {
        throw new NotFoundException('Cliente no encontrado');
      }

      // Use customer data as fallback
      if (!taxId) taxId = customer.taxId;
      if (!businessName) businessName = customer.businessName;
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: createInvoiceDto.orderId,
        customerId: createInvoiceDto.customerId,
        status: 'ISSUED',
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        taxId,
        businessName,
        issuedAt: new Date(),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            items: {
              include: {
                product: {
                  select: { id: true, name: true, price: true },
                },
              },
            },
          },
        },
        customer: true,
      },
    });

    return invoice;
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            items: {
              include: {
                product: {
                  select: { id: true, name: true, price: true },
                },
                modifiers: {
                  include: { modifierOption: true },
                },
              },
            },
          },
        },
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return invoice;
  }

  async findAll(orderId?: string, status?: string) {
    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (status) where.status = status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async voidInvoice(id: string, voidDto: VoidInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (invoice.status === 'VOIDED') {
      throw new BadRequestException('Esta factura ya esta anulada');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Esta factura ya esta cancelada');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'VOIDED',
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, total: true },
        },
        customer: true,
      },
    });
  }
}
