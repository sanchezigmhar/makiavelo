import { IsString, IsOptional, IsUUID, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipeItemDto {
  @IsUUID()
  supplyId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;
}

export class CreateRecipeDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  yield?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}

export class UpdateRecipeDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  yield?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items?: RecipeItemDto[];
}
