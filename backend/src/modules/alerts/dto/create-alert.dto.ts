import { IsString, IsOptional, IsUUID, IsEnum, IsObject } from 'class-validator';
import { AlertType, AlertSeverity } from '@prisma/client';

export class CreateAlertDto {
  @IsEnum(AlertType)
  type: AlertType;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
