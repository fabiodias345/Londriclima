import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CriarLevantamentoDto {
  @IsUUID()
  @IsOptional()
  cliente_id!: string;

  @IsUUID()
  @IsOptional()
  conversa_id?: string;

  @IsString()
  @MinLength(3)
  problema!: string;

  @IsOptional()
  @IsIn(["manutencao_preventiva", "manutencao_corretiva", "instalacao", "pmoc", "outros"])
  tipo_servico?: string;
}

export class AgendarLevantamentoDto {
  @IsUUID()
  @IsOptional()
  equipe_id?: string;

  @IsUUID()
  @IsOptional()
  tecnico_id?: string;

  @IsDateString()
  agendada_para!: string;
}

export class CancelarLevantamentoDto {
  @IsString()
  @IsOptional()
  motivo?: string;
}

export class SolicitarAutorizacaoLevantamentoDto {
  @IsNumber()
  valor!: number;
}

export class ReabrirLevantamentoDto {
  @IsString()
  motivo!: string;
}
