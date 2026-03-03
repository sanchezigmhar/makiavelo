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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, VoidInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles('owner', 'admin', 'cashier')
  create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  @Post('dgi')
  @Roles('owner', 'admin', 'cashier', 'server')
  createAndSendToDgi(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.createAndSendToDgi(createInvoiceDto);
  }

  @Post(':id/dgi')
  @Roles('owner', 'admin', 'cashier', 'server')
  sendToDgi(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.sendToDgi(id);
  }

  @Get()
  findAll(
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll(orderId, status);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id/void')
  @Roles('owner', 'admin')
  voidInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() voidDto: VoidInvoiceDto,
  ) {
    return this.invoicesService.voidInvoice(id, voidDto);
  }
}
