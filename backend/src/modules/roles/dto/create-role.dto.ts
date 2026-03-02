import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsOptional()
  @IsObject()
  permissions?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
