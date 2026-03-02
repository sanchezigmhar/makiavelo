import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseStatusDto,
  ReceivePurchaseDto,
} from './dto/create-purchase-order.dto';
import { PurchaseOrderStatus, MovementType } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastOrder = await this.prisma.purchaseOrder.findFirst({
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

  async create(userId: string, createDto: CreatePurchaseOrderDto) {
    // Validate supplier exists
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: createDto.supplierId },
    });

    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    if (!supplier.isActive) {
      throw new BadRequestException('El proveedor no esta activo');
    }

    // Validate all supplies exist
    for (const item of createDto.items) {
      const supply = await this.prisma.supply.findUnique({
        where: { id: item.supplyId },
      });

      if (!supply) {
        throw new NotFoundException(`Insumo ${item.supplyId} no encontrado`);
      }
    }

    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    const items = createDto.items.map((item) => ({
      supplyId: item.supplyId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.quantity * item.unitCost,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalCost, 0);
    const tax = subtotal * 0.07; // 7% ITBMS Panama
    const total = subtotal + tax;

    // Create purchase order with items
    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: createDto.supplierId,
        branchId: createDto.branchId,
        status: PurchaseOrderStatus.DRAFT,
        subtotal,
        tax,
        total,
        notes: createDto.notes,
        expectedAt: createDto.expectedAt ? new Date(createDto.expectedAt) : null,
        items: {
          create: items,
        },
      },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            supply: {
              select: { id: true, name: true, unit: true, sku: true },
            },
          },
        },
      },
    });

    return purchaseOrder;
  }

  async findAll(branchId?: string, supplierId?: string, status?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: { id: true, name: true, contactName: true },
        },
        branch: {
          select: { id: true, name: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            supply: {
              select: { id: true, name: true, unit: true, sku: true, currentStock: true },
            },
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    return purchaseOrder;
  }

  async updateStatus(id: string, updateStatusDto: UpdatePurchaseStatusDto) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PARTIAL', 'RECEIVED', 'CANCELLED'],
      PARTIAL: ['RECEIVED', 'CANCELLED'],
    };

    const currentStatus = purchaseOrder.status;
    const newStatus = updateStatusDto.status;

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de ${currentStatus} a ${newStatus}`,
      );
    }

    const data: any = { status: newStatus };
    if (newStatus === 'RECEIVED') {
      data.receivedAt = new Date();
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            supply: {
              select: { id: true, name: true, unit: true, sku: true },
            },
          },
        },
      },
    });
  }

  async receive(id: string, userId: string, receiveDto: ReceivePurchaseDto) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    if (
      purchaseOrder.status === PurchaseOrderStatus.RECEIVED ||
      purchaseOrder.status === PurchaseOrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `No se puede recibir una orden con estado ${purchaseOrder.status}`,
      );
    }

    // Process each received item
    for (const receiveItem of receiveDto.items) {
      const poItem = purchaseOrder.items.find((i) => i.id === receiveItem.itemId);

      if (!poItem) {
        throw new NotFoundException(`Item ${receiveItem.itemId} no encontrado en la orden`);
      }

      if (receiveItem.receivedQty < 0) {
        throw new BadRequestException('La cantidad recibida no puede ser negativa');
      }

      // Update received quantity on the purchase order item
      await this.prisma.purchaseOrderItem.update({
        where: { id: receiveItem.itemId },
        data: {
          receivedQty: { increment: receiveItem.receivedQty },
        },
      });

      // Create inventory movement for the received quantity
      if (receiveItem.receivedQty > 0) {
        await this.prisma.inventoryMovement.create({
          data: {
            supplyId: poItem.supplyId,
            branchId: purchaseOrder.branchId,
            type: MovementType.IN,
            quantity: receiveItem.receivedQty,
            unitCost: poItem.unitCost,
            totalCost: receiveItem.receivedQty * poItem.unitCost,
            reference: `OC: ${purchaseOrder.orderNumber}`,
            notes: receiveDto.notes,
            performedBy: userId,
          },
        });

        // Update supply stock
        await this.prisma.supply.update({
          where: { id: poItem.supplyId },
          data: {
            currentStock: { increment: receiveItem.receivedQty },
            costPerUnit: poItem.unitCost,
          },
        });
      }
    }

    // Determine new status based on received quantities
    const updatedItems = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
    });

    const allFullyReceived = updatedItems.every(
      (item) => item.receivedQty >= item.quantity,
    );
    const someReceived = updatedItems.some((item) => item.receivedQty > 0);

    let newStatus: PurchaseOrderStatus;
    if (allFullyReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (someReceived) {
      newStatus = PurchaseOrderStatus.PARTIAL;
    } else {
      newStatus = purchaseOrder.status;
    }

    const data: any = { status: newStatus };
    if (newStatus === PurchaseOrderStatus.RECEIVED) {
      data.receivedAt = new Date();
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data,
    });

    return this.findOne(id);
  }
}
