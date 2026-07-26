import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum LimpezaRecomendadaDto {
  nao_recomendada = "nao_recomendada",
  recomendada = "recomendada",
  urgente = "urgente"
}

export enum LevantamentoDecisaoDto {
  precisa_orcamento = "precisa_orcamento",
  resolvido_na_visita = "resolvido_na_visita"
}

export class ItemLaudoLevantamentoDto {
  @IsString()
  descricao!: string;

  @IsOptional()
  @IsNumber()
  quantidade?: number;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class SalvarLaudoLevantamentoDto {
  @IsOptional() @IsString() diagnostico?: string;
  @IsOptional() @IsString() causa_provavel?: string;
  @IsOptional() @IsString() servicos_recomendados?: string;
  @IsOptional() @IsEnum(LimpezaRecomendadaDto) limpeza_recomendada?: "nao_recomendada" | "recomendada" | "urgente";
  @IsOptional() @IsString() observacoes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ItemLaudoLevantamentoDto)
  itens?: ItemLaudoLevantamentoDto[];
}

export class FinalizarLaudoLevantamentoDto extends SalvarLaudoLevantamentoDto {
  @IsString() @IsEnum(LevantamentoDecisaoDto) decisao!: "precisa_orcamento" | "resolvido_na_visita";
}

export class ReabrirLaudoLevantamentoDto {
  @IsString() motivo!: string;
}
