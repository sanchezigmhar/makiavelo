import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createMovement(userId: string, createMovementDto: CreateMovementDto) {
    const supply = await this.prisma.supply.findUnique({
      where: { id: createMovementDto.supplyId },
    });

    if (!supply) {
      throw new NotFoundException('Insumo no encontrado');
    }

    const totalCost = createMovementDto.unitCost
      ? createMovementDto.unitCost * createMovementDto.quantity
      : null;

    // Create movement
    const movement = await this.prisma.inventoryMovement.create({
      data: {
        supplyId: createMovementDto.supplyId,
        branchId: createMovementDto.branchId,
        type: createMovementDto.type,
        quantity: createMovementDto.quantity,
        unitCost: createMovementDto.unitCost,
        totalCost,
        reference: createMovementDto.reference,
        notes: createMovementDto.notes,
        performedBy: userId,
      },
      include: {
        supply: true,
        branch: true,
      },
    });

    // Update supply stock
    let stockChange = createMovementDto.quantity;
    if (
      createMovementDto.type === MovementType.OUT ||
      createMovementDto.type === MovementType.WASTE
    ) {
      stockChange = -stockChange;
    } else if (createMovementDto.type === MovementType.ADJUSTMENT) {
      // For adjustments, set the stock directly
      await this.prisma.supply.update({
        where: { id: createMovementDto.supplyId },
        data: {
          currentStock: createMovementDto.quantity,
          costPerUnit: createMovementDto.unitCost || supply.costPerUnit,
        },
      });
      return movement;
    }

    await this.prisma.supply.update({
      where: { id: createMovementDto.supplyId },
      data: {
        currentStock: { increment: stockChange },
        costPerUnit: createMovementDto.unitCost || supply.costPerUnit,
      },
    });

    return movement;
  }

  async findMovements(
    paginationDto: PaginationDto,
    supplyId?: string,
    branchId?: string,
    type?: string,
  ) {
    const { page, limit, skip, sortOrder } = paginationDto;

    const where: any = {};
    if (supplyId) where.supplyId = supplyId;
    if (branchId) where.branchId = branchId;
    if (type) where.type = type;

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: sortOrder },
        include: {
          supply: true,
          branch: true,
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getStockReport(branchId?: string) {
    const supplies = await this.prisma.supply.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return supplies.map((supply) => ({
      id: supply.id,
      name: supply.name,
      sku: supply.sku,
      unit: supply.unit,
      currentStock: supply.currentStock,
      minStock: supply.minStock,
      maxStock: supply.maxStock,
      costPerUnit: supply.costPerUnit,
      totalValue: supply.currentStock * supply.costPerUnit,
      isLowStock: supply.currentStock <= supply.minStock,
      isOverStock: supply.maxStock ? supply.currentStock >= supply.maxStock : false,
    }));
  }

  async getLowStockAlerts(branchId?: string) {
    // Use raw query comparison since Prisma doesn't support column-to-column comparison directly
    const supplies = await this.prisma.supply.findMany({
      where: { isActive: true },
      orderBy: { currentStock: 'asc' },
    });

    return supplies
      .filter((s) => s.currentStock <= s.minStock)
      .map((supply) => ({
        id: supply.id,
        name: supply.name,
        currentStock: supply.currentStock,
        minStock: supply.minStock,
        unit: supply.unit,
        deficit: supply.minStock - supply.currentStock,
      }));
  }
}
