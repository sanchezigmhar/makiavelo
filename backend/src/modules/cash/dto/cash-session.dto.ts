import { IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsUUID()
  cashRegisterId: string;

  @IsOptional()
  @IsUUID()
  shiftId?: string;

  @IsNumber()
  @Min(0)
  openingAmount: number;
}

export class CloseCashSessionDto {
  @IsNumber()
  @Min(0)
  closingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
