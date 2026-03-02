import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRecipeDto, UpdateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(createRecipeDto: CreateRecipeDto) {
    const { items, ...recipeData } = createRecipeDto;

    const recipe = await this.prisma.recipe.create({
      data: {
        ...recipeData,
        items: {
          create: items.map((item) => ({
            supplyId: item.supplyId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
      include: {
        product: true,
        items: {
          include: { supply: true },
        },
      },
    });

    return recipe;
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      where: { isActive: true },
      include: {
        product: {
          include: { category: true },
        },
        items: {
          include: { supply: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        product: {
          include: { category: true },
        },
        items: {
          include: { supply: true },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Receta no encontrada');
    }

    return recipe;
  }

  async findByProduct(productId: string) {
    return this.prisma.recipe.findMany({
      where: { productId, isActive: true },
      include: {
        product: true,
        items: {
          include: { supply: true },
        },
      },
    });
  }

  async update(id: string, updateRecipeDto: UpdateRecipeDto) {
    await this.findOne(id);

    const { items, ...recipeData } = updateRecipeDto;

    if (items !== undefined) {
      // Delete existing items and create new ones
      await this.prisma.recipeItem.deleteMany({
        where: { recipeId: id },
      });

      if (items.length > 0) {
        await Promise.all(
          items.map((item) =>
            this.prisma.recipeItem.create({
              data: {
                recipeId: id,
                supplyId: item.supplyId,
                quantity: item.quantity,
                unit: item.unit,
              },
            }),
          ),
        );
      }
    }

    await this.prisma.recipe.update({
      where: { id },
      data: recipeData,
    });

    return this.findOne(id);
  }

  async calculateCost(id: string) {
    const recipe = await this.findOne(id);

    let totalCost = 0;
    const breakdown = recipe.items.map((item) => {
      const cost = item.quantity * item.supply.costPerUnit;
      totalCost += cost;
      return {
        supply: item.supply.name,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.supply.costPerUnit,
        totalCost: cost,
      };
    });

    const costPerUnit = totalCost / (recipe.yield || 1);

    return {
      recipeId: recipe.id,
      productName: recipe.product.name,
      productPrice: recipe.product.price,
      yield: recipe.yield,
      totalCost,
      costPerUnit,
      profitMargin: recipe.product.price > 0
        ? ((recipe.product.price - costPerUnit) / recipe.product.price) * 100
        : 0,
      breakdown,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.recipe.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Receta desactivada exitosamente' };
  }
}
