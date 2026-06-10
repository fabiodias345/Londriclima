import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, Max, Min } from "class-validator";
import { OrdemServicoEventoAcao } from "@prisma/client";

export class AtualizarStatusOsDto {
  @IsEnum(OrdemServicoEventoAcao)
  acao: OrdemServicoEventoAcao;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsDateString()
  registrado_em: string;
}
