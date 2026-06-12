import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class SalvarEquipamentoDto {
  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  patrimonio?: string;

  @IsOptional()
  @IsString()
  codigo_barras?: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  @IsOptional()
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

  @IsOptional()
  @IsBoolean()
  acesso_publico_ativo?: boolean;
}
