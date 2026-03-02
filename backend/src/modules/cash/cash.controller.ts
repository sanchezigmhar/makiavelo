import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CashService } from './cash.service';
import { OpenCashSessionDto, CloseCashSessionDto } from './dto/cash-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('sessions/open')
  @Roles('owner', 'admin', 'cashier')
  openSession(
    @CurrentUser('id') userId: string,
    @Body() openDto: OpenCashSessionDto,
  ) {
    return this.cashService.openSession(userId, openDto);
  }

  @Post('sessions/:id/close')
  @Roles('owner', 'admin', 'cashier')
  closeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() closeDto: CloseCashSessionDto,
  ) {
    return this.cashService.closeSession(id, closeDto);
  }

  @Get('sessions/:id/summary')
  getSessionSummary(@Param('id', ParseUUIDPipe) id: string) {
    return this.cashService.getSessionSummary(id);
  }

  @Get('sessions/active')
  findActiveSessions(@Query('branchId') branchId?: string) {
    return this.cashService.findActiveSessions(branchId);
  }

  @Get('sessions')
  findAll(@Query('branchId') branchId?: string) {
    return this.cashService.findAll(branchId);
  }

  @Get('registers')
  getCashRegisters(@Query('branchId') branchId?: string) {
    return this.cashService.getCashRegisters(branchId);
  }
}
