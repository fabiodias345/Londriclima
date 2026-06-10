import { Type } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CriarAbastecimentoDto {
  @IsUUID()
  veiculo_id: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  odometro_km: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  litros: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  valor_total: number;

  @IsDateString()
  abastecido_em: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  posto?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  observacao?: string;
}
