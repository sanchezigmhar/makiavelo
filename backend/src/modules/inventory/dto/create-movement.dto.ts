import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, Min } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsUUID()
  supplyId: string;

  @IsUUID()
  branchId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
