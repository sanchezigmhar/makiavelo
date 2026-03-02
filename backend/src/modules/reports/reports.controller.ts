import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales/:branchId')
  getDailySales(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getDailySales(branchId, date);
  }

  @Get('sales-by-product/:branchId')
  getSalesByProduct(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesByProduct(branchId, startDate, endDate);
  }

  @Get('sales-by-category/:branchId')
  getSalesByCategory(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesByCategory(branchId, startDate, endDate);
  }

  @Get('dashboard/:branchId')
  getDashboardKPIs(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.reportsService.getDashboardKPIs(branchId);
  }

  @Get('sales-timeline/:branchId')
  getSalesTimeline(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('days') days?: number,
  ) {
    return this.reportsService.getSalesTimeline(branchId, days || 7);
  }

  @Get('server-performance/:branchId')
  getServerPerformance(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Query('date') date?: string,
  ) {
    return this.reportsService.getServerPerformance(branchId, date);
  }
}
