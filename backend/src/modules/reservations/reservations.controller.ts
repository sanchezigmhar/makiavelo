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
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/create-reservation.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.findAll(paginationDto, branchId, date, status);
  }

  @Get('today/:branchId')
  findToday(@Param('branchId', ParseUUIDPipe) branchId: string) {
    return this.reservationsService.findToday(branchId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  @Patch(':id/confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.confirm(id);
  }

  @Patch(':id/seat')
  seat(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.seat(id);
  }

  @Patch(':id/complete')
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.complete(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.cancel(id);
  }

  @Patch(':id/no-show')
  noShow(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.noShow(id);
  }
}
