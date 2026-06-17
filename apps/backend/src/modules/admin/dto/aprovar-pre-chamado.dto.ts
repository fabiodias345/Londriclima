import { Type } from "class-transformer";
import { IsArray, IsDateString, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

export class AprovarPreChamadoDto {
  @IsOptional()
  @IsDateString()
  agendada_para?: string;

  @IsOptional()
  @IsUUID()
  equipe_id?: string;

  @IsOptional()
  @IsUUID()
  tecnico_id?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  equipe_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  usuario_ids?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_cobrado?: number;
}
