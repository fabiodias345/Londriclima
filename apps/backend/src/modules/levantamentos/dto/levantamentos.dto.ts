import { IsDateString, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

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
