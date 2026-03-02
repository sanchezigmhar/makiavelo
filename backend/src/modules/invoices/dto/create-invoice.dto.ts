import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  orderId: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  businessName?: string;
}

export class VoidInvoiceDto {
  @IsString()
  reason: string;
}
