import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  AddItemsDto,
  ApplyDiscountDto,
  PayOrderDto,
  CancelOrderDto,
  CancelItemDto,
  SplitOrderDto,
} from './dto/update-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, createOrderDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(paginationDto, branchId, status);
  }

  @Get('active')
  findActive(@Query('branchId') branchId?: string) {
    return this.ordersService.findActive(branchId);
  }

  @Get('table/:tableId')
  findByTable(@Param('tableId', ParseUUIDPipe) tableId: string) {
    return this.ordersService.findByTable(tableId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Post(':id/items')
  addItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addItemsDto: AddItemsDto,
  ) {
    return this.ordersService.addItems(id, addItemsDto);
  }

  @Post(':id/send-to-kitchen')
  sendToKitchen(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.sendToKitchen(id);
  }

  @Post(':id/discount')
  @Roles('owner', 'admin')
  applyDiscount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() discountDto: ApplyDiscountDto,
  ) {
    return this.ordersService.applyDiscount(id, discountDto);
  }

  @Post(':id/pay')
  @Roles('owner', 'admin', 'cashier', 'server')
  payOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payDto: PayOrderDto,
  ) {
    return this.ordersService.payOrder(id, payDto);
  }

  @Post(':id/close')
  @Roles('owner', 'admin', 'cashier')
  closeOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.closeOrder(id);
  }

  @Post(':id/cancel')
  @Roles('owner', 'admin')
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder(id, cancelDto);
  }

  @Post(':id/items/:itemId/cancel')
  @Roles('owner', 'admin', 'server')
  cancelItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() cancelDto: CancelItemDto,
  ) {
    return this.ordersService.cancelItem(id, itemId, cancelDto);
  }

  @Post(':id/split')
  @Roles('owner', 'admin', 'cashier', 'server')
  splitOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() splitDto: SplitOrderDto,
  ) {
    return this.ordersService.splitOrder(id, userId, splitDto);
  }
}
