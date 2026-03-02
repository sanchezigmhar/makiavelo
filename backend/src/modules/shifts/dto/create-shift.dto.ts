import { IsString, IsOptional, IsUUID, IsBoolean, IsEnum } from 'class-validator';

enum ShiftType {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  EVENING = 'EVENING',
  CUSTOM = 'CUSTOM',
}

export class CreateShiftDto {
  @IsString()
  name: string;

  @IsUUID()
  branchId: string;

  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
