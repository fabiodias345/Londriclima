import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsString, Max, Min } from "class-validator";

export class FinalizarOsDto {
  @IsString()
  @IsNotEmpty()
  assinatura_cliente_base64: string;

  @IsString()
  @IsNotEmpty()
  nome_responsavel_assinatura: string;

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
  finalizado_em: string;
}
