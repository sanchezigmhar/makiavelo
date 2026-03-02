import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    if (createCustomerDto.email) {
      const existing = await this.prisma.customer.findUnique({
        where: { email: createCustomerDto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }

    return this.prisma.customer.create({
      data: createCustomerDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit, skip, sortBy, sortOrder, search } = paginationDto;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: { include: { product: true } },
          },
        },
        reservations: {
          orderBy: { reservationDate: 'desc' },
          take: 10,
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id);

    if (updateCustomerDto.email) {
      const existing = await this.prisma.customer.findFirst({
        where: { email: updateCustomerDto.email, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con ese email');
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });
  }

  async getTopCustomers(limit: number = 10) {
    return this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: limit,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Cliente desactivado exitosamente' };
  }
}
