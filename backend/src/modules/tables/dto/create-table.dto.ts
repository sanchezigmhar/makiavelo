import { IsString, IsOptional, IsInt, IsUUID, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsNumber()
  posX?: number;

  @IsOptional()
  @IsNumber()
  posY?: number;

  @IsOptional()
  @IsString()
  shape?: string;
}
