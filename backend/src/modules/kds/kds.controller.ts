import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { KdsService } from './kds.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('kds')
@UseGuards(JwtAuthGuard)
export class KdsController {
  constructor(private readonly kdsService: KdsService) {}

  @Get('orders')
  getKdsOrders(@Query('branchId') branchId?: string) {
    return this.kdsService.getKdsOrders(branchId);
  }

  @Get('station/:station')
  getItemsByStation(
    @Param('station') station: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.kdsService.getItemsByStation(station, branchId);
  }

  @Get('items')
  getAllPendingItems(@Query('branchId') branchId?: string) {
    return this.kdsService.getAllPendingItems(branchId);
  }

  @Post('items/:itemId/bump')
  bumpItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.kdsService.bumpItem(itemId);
  }

  @Post('items/:itemId/deliver')
  markDelivered(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.kdsService.markDelivered(itemId);
  }

  @Post('items/:itemId/recall')
  recallItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.kdsService.recallItem(itemId);
  }

  @Get('stats')
  getStats(@Query('branchId') branchId?: string) {
    return this.kdsService.getStats(branchId);
  }
}
