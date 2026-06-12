import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class IdentificarEquipamentoDto {
  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacidade_btu?: number;

  @IsOptional()
  @IsString()
  gas_refrigerante?: string;

  @IsOptional()
  @IsString()
  numero_serie?: string;

  @IsOptional()
  @IsString()
  local_instalacao?: string;
}
