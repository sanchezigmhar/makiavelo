import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseStatusDto,
  ReceivePurchaseDto,
} from './dto/create-purchase-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @Roles('owner', 'admin')
  create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreatePurchaseOrderDto,
  ) {
    return this.purchasesService.create(userId, createDto);
  }

  @Get()
  findAll(
    @Query('branchId') branchId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.purchasesService.findAll(branchId, supplierId, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchasesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('owner', 'admin')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateStatusDto: UpdatePurchaseStatusDto,
  ) {
    return this.purchasesService.updateStatus(id, updateStatusDto);
  }

  @Post(':id/receive')
  @Roles('owner', 'admin')
  receive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() receiveDto: ReceivePurchaseDto,
  ) {
    return this.purchasesService.receive(id, userId, receiveDto);
  }
}
