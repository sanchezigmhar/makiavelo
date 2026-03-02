import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(createZoneDto: CreateZoneDto) {
    return this.prisma.zone.create({
      data: createZoneDto,
      include: {
        branch: true,
        _count: { select: { tables: true } },
      },
    });
  }

  async findAll(branchId?: string) {
    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.zone.findMany({
      where,
      include: {
        branch: true,
        tables: {
          where: { isActive: true },
          orderBy: { number: 'asc' },
        },
        _count: { select: { tables: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        branch: true,
        tables: {
          where: { isActive: true },
          orderBy: { number: 'asc' },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('Zona no encontrada');
    }

    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto) {
    await this.findOne(id);

    return this.prisma.zone.update({
      where: { id },
      data: updateZoneDto,
      include: {
        branch: true,
        _count: { select: { tables: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.zone.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Zona desactivada exitosamente' };
  }
}
