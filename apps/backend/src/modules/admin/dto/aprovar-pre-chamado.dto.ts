import { Type } from "class-transformer";
import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_cobrado?: number;
}
