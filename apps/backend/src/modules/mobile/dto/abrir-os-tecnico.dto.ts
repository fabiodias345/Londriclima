import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { OrdemServicoTipoServico } from "@prisma/client";

export class AbrirOsTecnicoDto {
  @IsUUID()
  cliente_id!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  titulo!: string;

  @IsEnum(OrdemServicoTipoServico)
  tipo_servico!: OrdemServicoTipoServico;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  problema_relatado?: string;

  @IsOptional()
  @IsUUID()
  equipamento_id?: string;

  @IsOptional()
  @IsUUID()
  endereco_id?: string;
}
