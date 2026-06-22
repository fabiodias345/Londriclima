import { Type } from "class-transformer";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from "class-validator";

export class DadoEquipamentoImpossivelDto {
  @IsString()
  @IsNotEmpty()
  campo: string;

  @IsString()
  @IsNotEmpty()
  observacao: string;
}

export class IdentificarEquipamentoDto {
  @IsOptional()
  @IsUUID()
  equipamento_id?: string;

  @IsString()
  @IsNotEmpty()
  codigo_qr: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DadoEquipamentoImpossivelDto)
  dados_impossiveis?: DadoEquipamentoImpossivelDto[];
}
