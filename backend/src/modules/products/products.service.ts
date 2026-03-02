import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto, buildPaginationMeta } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { modifierIds, ...productData } = createProductDto;

    const product = await this.prisma.product.create({
      data: productData,
    });

    if (modifierIds && modifierIds.length > 0) {
      await Promise.all(
        modifierIds.map((modifierId, index) =>
          this.prisma.productModifier.create({
            data: {
              productId: product.id,
              modifierId,
              sortOrder: index,
            },
          }),
        ),
      );
    }

    return this.findOne(product.id);
  }

  async findAll(paginationDto: PaginationDto, categoryId?: string, branchId?: string) {
    const { page, limit, skip, sortBy, sortOrder, search } = paginationDto;

    const where: any = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          productModifiers: {
            include: {
              modifier: {
                include: {
                  options: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async findByCategory(categoryId: string) {
    return this.prisma.product.findMany({
      where: { categoryId, isActive: true, isAvailable: true },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        productModifiers: {
          include: {
            modifier: {
              include: {
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        recipes: {
          include: {
            items: {
              include: { supply: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    const { modifierIds, ...productData } = updateProductDto;

    await this.prisma.product.update({
      where: { id },
      data: productData,
    });

    if (modifierIds !== undefined) {
      // Remove existing modifiers
      await this.prisma.productModifier.deleteMany({
        where: { productId: id },
      });

      // Add new modifiers
      if (modifierIds.length > 0) {
        await Promise.all(
          modifierIds.map((modifierId, index) =>
            this.prisma.productModifier.create({
              data: {
                productId: id,
                modifierId,
                sortOrder: index,
              },
            }),
          ),
        );
      }
    }

    return this.findOne(id);
  }

  async toggleAvailability(id: string) {
    const product = await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data: { isAvailable: !product.isAvailable },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Producto desactivado exitosamente' };
  }

  async getMenu(branchId?: string) {
    const where: any = { isActive: true };
    if (branchId) {
      where.branchId = branchId;
    }

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        products: {
          where: { isActive: true, isAvailable: true },
          include: {
            productModifiers: {
              include: {
                modifier: {
                  include: {
                    options: {
                      where: { isActive: true },
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }
}
