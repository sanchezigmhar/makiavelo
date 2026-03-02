import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  async create(creatorId: string, createAlertDto: CreateAlertDto) {
    return this.prisma.alert.create({
      data: {
        ...createAlertDto,
        createdBy: creatorId,
      },
      include: {
        branch: true,
        user: { select: { id: true, firstName: true, lastName: true } },
        creator: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findAll(paginationDto: PaginationDto, branchId?: string, userId?: string, unreadOnly?: boolean) {
    const { page, limit, skip } = paginationDto;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (userId) where.userId = userId;
    if (unreadOnly) where.isRead = false;

    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          branch: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          creator: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.alert.count({ where }),
    ]);

    return {
      data: alerts,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getUnreadCount(userId?: string, branchId?: string) {
    const where: any = { isRead: false };
    if (userId) where.userId = userId;
    if (branchId) where.branchId = branchId;

    const count = await this.prisma.alert.count({ where });
    return { unreadCount: count };
  }

  async markAsRead(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }

    return this.prisma.alert.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId?: string, branchId?: string) {
    const where: any = { isRead: false };
    if (userId) where.userId = userId;
    if (branchId) where.branchId = branchId;

    const result = await this.prisma.alert.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { markedCount: result.count };
  }

  async delete(id: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id } });

    if (!alert) {
      throw new NotFoundException('Alerta no encontrada');
    }

    await this.prisma.alert.delete({ where: { id } });
    return { message: 'Alerta eliminada' };
  }
}
