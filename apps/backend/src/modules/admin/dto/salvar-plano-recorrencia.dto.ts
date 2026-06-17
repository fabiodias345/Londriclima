import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { PlanoRecorrenciaFrequencia } from "@prisma/client";

export class SalvarPlanoRecorrenciaDto {
  @IsUUID()
  cliente_id!: string;

  @IsOptional()
  @IsUUID()
  equipamento_id?: string;

  @IsOptional()
  @IsUUID()
  equipe_id?: string;

  @IsOptional()
  @IsUUID()
  tecnico_id?: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  detalhes?: string;

  @IsEnum(PlanoRecorrenciaFrequencia)
  frequencia!: PlanoRecorrenciaFrequencia;

  @IsDateString()
  proxima_execucao!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_cobrado?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
