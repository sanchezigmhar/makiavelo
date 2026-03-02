import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('movements')
  @Roles('owner', 'admin', 'chef')
  createMovement(
    @CurrentUser('id') userId: string,
    @Body() createMovementDto: CreateMovementDto,
  ) {
    return this.inventoryService.createMovement(userId, createMovementDto);
  }

  @Get('movements')
  findMovements(
    @Query() paginationDto: PaginationDto,
    @Query('supplyId') supplyId?: string,
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.findMovements(paginationDto, supplyId, branchId, type);
  }

  @Get('stock')
  getStockReport(@Query('branchId') branchId?: string) {
    return this.inventoryService.getStockReport(branchId);
  }

  @Get('low-stock')
  getLowStockAlerts(@Query('branchId') branchId?: string) {
    return this.inventoryService.getLowStockAlerts(branchId);
  }
}
