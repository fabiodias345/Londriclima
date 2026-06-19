import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SalvarVeiculoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsString()
  rastreador_imei?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
