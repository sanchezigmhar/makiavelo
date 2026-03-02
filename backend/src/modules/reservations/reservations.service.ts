import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/create-reservation.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';
import { ReservationStatus } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaService) {}

  async create(createReservationDto: CreateReservationDto) {
    // Check table availability if a table is specified
    if (createReservationDto.tableId) {
      const conflicting = await this.prisma.reservation.findFirst({
        where: {
          tableId: createReservationDto.tableId,
          reservationDate: new Date(createReservationDto.reservationDate),
          startTime: createReservationDto.startTime,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (conflicting) {
        throw new BadRequestException('Ya existe una reservacion para esta mesa en ese horario');
      }
    }

    return this.prisma.reservation.create({
      data: {
        ...createReservationDto,
        reservationDate: new Date(createReservationDto.reservationDate),
      },
      include: {
        customer: true,
        table: { include: { zone: true } },
        branch: true,
      },
    });
  }

  async findAll(paginationDto: PaginationDto, branchId?: string, date?: string, status?: string) {
    const { page, limit, skip, sortOrder, search } = paginationDto;

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (date) where.reservationDate = new Date(date);
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { guestName: { contains: search, mode: 'insensitive' } },
        { guestPhone: { contains: search, mode: 'insensitive' } },
        { guestEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [reservations, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reservationDate: sortOrder },
        include: {
          customer: true,
          table: { include: { zone: true } },
        },
      }),
      this.prisma.reservation.count({ where }),
    ]);

    return {
      data: reservations,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findToday(branchId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    return this.prisma.reservation.findMany({
      where: {
        branchId,
        reservationDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
      },
      include: {
        customer: true,
        table: { include: { zone: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        customer: true,
        table: { include: { zone: true } },
        branch: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservacion no encontrada');
    }

    return reservation;
  }

  async update(id: string, updateReservationDto: UpdateReservationDto) {
    await this.findOne(id);

    const data: any = { ...updateReservationDto };
    if (updateReservationDto.reservationDate) {
      data.reservationDate = new Date(updateReservationDto.reservationDate);
    }

    return this.prisma.reservation.update({
      where: { id },
      data,
      include: {
        customer: true,
        table: { include: { zone: true } },
      },
    });
  }

  async confirm(id: string) {
    return this.updateStatus(id, ReservationStatus.CONFIRMED);
  }

  async seat(id: string) {
    const reservation = await this.findOne(id);

    // Mark table as reserved/occupied
    if (reservation.tableId) {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return this.updateStatus(id, ReservationStatus.SEATED);
  }

  async complete(id: string) {
    return this.updateStatus(id, ReservationStatus.COMPLETED);
  }

  async cancel(id: string) {
    const reservation = await this.findOne(id);

    if (reservation.tableId) {
      await this.prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.updateStatus(id, ReservationStatus.CANCELLED);
  }

  async noShow(id: string) {
    return this.updateStatus(id, ReservationStatus.NO_SHOW);
  }

  private async updateStatus(id: string, status: ReservationStatus) {
    return this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        table: { include: { zone: true } },
      },
    });
  }
}
