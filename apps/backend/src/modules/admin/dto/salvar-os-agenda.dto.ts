import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { CategoriaAtendimento, ChecklistTipo, OrdemServicoTipoServico } from "@prisma/client";

export class SalvarOsAgendaDto {
  @IsOptional()
  @IsUUID()
  cliente_id?: string;

  @IsOptional()
  @IsUUID()
  equipamento_id?: string;

  @IsOptional()
  @IsUUID()
  equipe_id?: string;

  @IsOptional()
  @IsUUID()
  tecnico_id?: string;

  @IsOptional()
  @IsEnum(CategoriaAtendimento)
  categoria_servico?: CategoriaAtendimento;

  @IsOptional()
  @IsEnum(OrdemServicoTipoServico)
  tipo_servico?: OrdemServicoTipoServico;

  @IsOptional()
  @IsEnum(ChecklistTipo)
  checklist_tipo?: ChecklistTipo;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  detalhes?: string;

  @IsOptional()
  @IsDateString()
  agendada_para?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_cobrado?: number;
}
