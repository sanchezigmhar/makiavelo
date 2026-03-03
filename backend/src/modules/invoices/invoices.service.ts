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

  /**
   * Simulate sending an invoice to DGI (Direccion General de Ingresos)
   * for electronic invoicing (Factura Electronica).
   *
   * In production, this would call the DGI API to:
   * 1. Generate a CUFE (Codigo Unico de Factura Electronica)
   * 2. Sign the XML document digitally
   * 3. Send to DGI's web service
   * 4. Get authorization response
   *
   * For now, this simulates the process with realistic delays and data.
   */
  async sendToDgi(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            branch: true,
            table: true,
          },
        },
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    if (invoice.status !== 'ISSUED') {
      throw new BadRequestException('Solo se pueden enviar facturas con estado ISSUED');
    }

    // Simulate DGI API processing time (1.5-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1500));

    // Generate simulated DGI response data
    const now = new Date();
    const cufe = this.generateCUFE(invoice.invoiceNumber, now);
    const qrCode = `https://dgi.mef.gob.pa/verificar?cufe=${cufe}`;
    const authNumber = `DGI-${now.getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

    // Build DGI response
    const dgiResponse = {
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: 'AUTHORIZED',
        issuedAt: invoice.issuedAt,
      },
      dgi: {
        cufe,
        authorizationNumber: authNumber,
        authorizationDate: now.toISOString(),
        qrCodeUrl: qrCode,
        protocolNumber: `PROT-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`,
        environment: 'DEMO', // In production: 'PRODUCCION'
        xmlSigned: true,
        receivedAt: now.toISOString(),
      },
      emitter: {
        ruc: '155123456-2-2024',
        dv: '78',
        businessName: 'MAKIAVELO RESTAURANTE, S.A.',
        tradeName: 'Makiavelo',
        address: 'Av. Principal #123, Zona Gastronomica',
        phone: '+507 6234-5678',
        email: 'facturacion@makiavelo.com',
        activityCode: '5610',
        activityDescription: 'Restaurantes y servicios de comida',
      },
      receiver: {
        ruc: invoice.taxId || 'CONSUMIDOR FINAL',
        businessName: invoice.businessName || 'Consumidor Final',
        type: invoice.taxId ? 'CONTRIBUYENTE' : 'CONSUMIDOR_FINAL',
      },
      document: {
        type: 'FACTURA',
        typeCode: '01',
        branch: '001',
        terminal: '001',
        number: invoice.invoiceNumber,
        issueDate: now.toISOString(),
        dueDate: now.toISOString(),
        currency: 'USD',
      },
      totals: {
        subtotal: invoice.subtotal,
        taxableAmount: invoice.subtotal,
        taxExemptAmount: 0,
        itbms: invoice.tax,
        itbmsRate: 0.07,
        discount: 0,
        total: invoice.total,
        totalInWords: this.numberToWords(invoice.total),
      },
      items: invoice.order.items.map((item, idx) => ({
        lineNumber: idx + 1,
        description: item.product?.name || `Producto #${idx + 1}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
        taxRate: 0.07,
        taxAmount: +(item.subtotal * 0.07).toFixed(2),
        total: +(item.subtotal * 1.07).toFixed(2),
      })),
    };

    return dgiResponse;
  }

  /**
   * Create invoice AND send to DGI in one step (convenience method)
   */
  async createAndSendToDgi(createInvoiceDto: CreateInvoiceDto) {
    const invoice = await this.create(createInvoiceDto);
    const dgiResponse = await this.sendToDgi(invoice.id);
    return dgiResponse;
  }

  /**
   * Generate a simulated CUFE (Codigo Unico de Factura Electronica)
   * Format: 8 hex groups separated by hyphens (similar to Panama DGI format)
   */
  private generateCUFE(invoiceNumber: string, date: Date): string {
    const base = `${invoiceNumber}-${date.getTime()}`;
    // Simple hash simulation
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const rand = () => Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
    return `${hex}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`.toUpperCase();
  }

  /**
   * Convert a number to words in Spanish (simplified)
   */
  private numberToWords(amount: number): string {
    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);
    // Simplified: just format as "X DOLARES CON XX/100"
    return `${dollars} DOLARES CON ${String(cents).padStart(2, '0')}/100`;
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
