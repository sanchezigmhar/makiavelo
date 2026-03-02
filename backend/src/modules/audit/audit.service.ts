import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAuditLogDto } from './dto/create-audit.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    dto: CreateAuditLogDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        oldValues: dto.oldValues,
        newValues: dto.newValues,
        ipAddress,
        userAgent,
      },
    });
  }

  async findAll(
    paginationDto: PaginationDto,
    userId?: string,
    entity?: string,
    action?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const { page, limit, skip } = paginationDto;

    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getActivitySummary(startDate?: string, endDate?: string) {
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(new Date().getDate() - 7));
    const end = endDate ? new Date(endDate) : new Date();
    end.setDate(end.getDate() + 1);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: start, lt: end },
      },
      select: {
        action: true,
        entity: true,
        userId: true,
      },
    });

    // Group by entity
    const byEntity: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};

    logs.forEach((log) => {
      byEntity[log.entity] = (byEntity[log.entity] || 0) + 1;
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      if (log.userId) {
        byUser[log.userId] = (byUser[log.userId] || 0) + 1;
      }
    });

    return {
      totalActions: logs.length,
      byEntity,
      byAction,
      byUser,
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };
  }
}
