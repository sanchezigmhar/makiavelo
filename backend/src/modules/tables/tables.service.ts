import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto, UpdateTableStatusDto } from './dto/update-table.dto';
import { TableStatus } from '@prisma/client';

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) {}

  async create(createTableDto: CreateTableDto) {
    const existing = await this.prisma.table.findUnique({
      where: {
        zoneId_number: {
          zoneId: createTableDto.zoneId,
          number: createTableDto.number,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe una mesa con ese numero en esta zona');
    }

    return this.prisma.table.create({
      data: createTableDto,
      include: { zone: true },
    });
  }

  async findAll(branchId?: string) {
    const where: any = { isActive: true };

    if (branchId) {
      where.zone = { branchId };
    }

    return this.prisma.table.findMany({
      where,
      include: {
        zone: true,
        orders: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: { product: true },
            },
          },
        },
      },
      orderBy: [{ zone: { sortOrder: 'asc' } }, { number: 'asc' }],
    });
  }

  async findByZone(zoneId: string) {
    return this.prisma.table.findMany({
      where: { zoneId, isActive: true },
      include: {
        zone: true,
        orders: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            guestCount: true,
            openedAt: true,
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: {
        zone: true,
        orders: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] },
          },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
            items: {
              include: {
                product: true,
                modifiers: {
                  include: { modifierOption: true },
                },
              },
            },
            payments: true,
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Mesa no encontrada');
    }

    return table;
  }

  async update(id: string, updateTableDto: UpdateTableDto) {
    await this.findOne(id);

    return this.prisma.table.update({
      where: { id },
      data: updateTableDto,
      include: { zone: true },
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateTableStatusDto) {
    await this.findOne(id);

    return this.prisma.table.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: { zone: true },
    });
  }

  async getStatusSummary(branchId: string) {
    const tables = await this.prisma.table.findMany({
      where: { zone: { branchId }, isActive: true },
      select: { status: true },
    });

    const summary = {
      total: tables.length,
      available: 0,
      occupied: 0,
      reserved: 0,
      cleaning: 0,
      blocked: 0,
    };

    tables.forEach((table) => {
      const key = table.status.toLowerCase();
      if (key in summary) {
        summary[key]++;
      }
    });

    return summary;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Mesa desactivada exitosamente' };
  }
}
