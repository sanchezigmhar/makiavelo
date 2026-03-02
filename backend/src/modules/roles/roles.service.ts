import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: createRoleDto.name },
    });

    if (existing) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

    return this.prisma.role.create({
      data: createRoleDto,
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);

    if (role.isSystem && updateRoleDto.name) {
      throw new BadRequestException('No se puede renombrar un rol del sistema');
    }

    if (updateRoleDto.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: updateRoleDto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un rol con ese nombre');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    }

    if (role._count.users > 0) {
      throw new BadRequestException('No se puede eliminar un rol con usuarios asignados');
    }

    await this.prisma.role.delete({ where: { id } });
    return { message: 'Rol eliminado exitosamente' };
  }
}
