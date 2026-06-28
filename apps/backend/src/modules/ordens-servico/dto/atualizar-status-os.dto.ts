import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsEnum, IsNumber, ValidateNested, Max, Min } from "class-validator";
import { OrdemServicoEventoAcao } from "@prisma/client";

export class SegurancaInternaDto {
  @IsBoolean()
  epis_confirmados: boolean;

  @IsBoolean()
  equipamento_desligado: boolean;

  @IsBoolean()
  area_ferramentas_seguras: boolean;

  @IsBoolean()
  trabalho_altura: boolean;

  @IsBoolean()
  nr35_valida: boolean;

  @IsBoolean()
  cinto_paraquedista: boolean;

  @IsBoolean()
  talabarte_ancorado: boolean;

  @IsBoolean()
  area_isolada: boolean;
}

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

  @ValidateNested()
  @Type(() => SegurancaInternaDto)
  seguranca?: SegurancaInternaDto;
}
