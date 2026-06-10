import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CriarPreChamadoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  telefone: string;

  @IsString()
  @IsNotEmpty()
  servico: string;

  @IsString()
  @IsNotEmpty()
  local: string;

  @IsOptional()
  @IsString()
  detalhes?: string;
}
