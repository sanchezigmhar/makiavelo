import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSupplyDto, UpdateSupplyDto } from './dto/create-supply.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class SuppliesService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplyDto: CreateSupplyDto) {
    return this.prisma.supply.create({
      data: createSupplyDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, skip, sortBy, sortOrder, search } = paginationDto;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [supplies, total] = await Promise.all([
      this.prisma.supply.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.supply.count({ where }),
    ]);

    return {
      data: supplies,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const supply = await this.prisma.supply.findUnique({
      where: { id },
      include: {
        recipeItems: {
          include: {
            recipe: {
              include: { product: true },
            },
          },
        },
        inventoryMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!supply) {
      throw new NotFoundException('Insumo no encontrado');
    }

    return supply;
  }

  async update(id: string, updateSupplyDto: UpdateSupplyDto) {
    await this.findOne(id);

    return this.prisma.supply.update({
      where: { id },
      data: updateSupplyDto,
    });
  }

  async getLowStock() {
    return this.prisma.supply.findMany({
      where: {
        isActive: true,
        currentStock: { lte: this.prisma.supply.fields.minStock as any },
      },
      orderBy: { currentStock: 'asc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.supply.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Insumo desactivado exitosamente' };
  }
}
