import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(createShiftDto: CreateShiftDto) {
    return this.prisma.shift.create({
      data: createShiftDto,
      include: {
        branch: true,
      },
    });
  }

  async findAll(branchId?: string) {
    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    return this.prisma.shift.findMany({
      where,
      include: {
        branch: true,
        _count: { select: { cashSessions: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        branch: true,
        cashSessions: {
          take: 10,
          orderBy: { openedAt: 'desc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Turno no encontrado');
    }

    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    await this.findOne(id);

    return this.prisma.shift.update({
      where: { id },
      data: updateShiftDto,
      include: {
        branch: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.shift.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Turno desactivado exitosamente' };
  }
}
