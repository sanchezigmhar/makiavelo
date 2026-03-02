import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { CreateOrderItemDto } from './create-order.dto';

export class AddItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class ApplyDiscountDto {
  @IsString()
  discountType: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  discountValue: number;
}

export class PayOrderDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tip?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  cashSessionId?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelItemDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SplitOrderDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @IsOptional()
  @IsUUID()
  tableId?: string;
}
