import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createAlertDto: CreateAlertDto,
  ) {
    return this.alertsService.create(userId, createAlertDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('branchId') branchId?: string,
    @Query('userId') userId?: string,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.alertsService.findAll(paginationDto, branchId, userId, unreadOnly);
  }

  @Get('unread-count')
  getUnreadCount(
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.alertsService.getUnreadCount(userId, branchId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(
    @Query('userId') userId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.alertsService.markAllAsRead(userId, branchId);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.alertsService.delete(id);
  }
}
