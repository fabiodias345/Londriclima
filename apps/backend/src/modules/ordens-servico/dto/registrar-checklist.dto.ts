import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

export class RegistrarChecklistPecaDto {
  @IsString()
  @IsNotEmpty()
  descricao_peca: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantidade: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  custo_unitario: number;
}

export class RegistrarChecklistDto {
  @IsString()
  @IsNotEmpty()
  servico_realizado: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  procedimentos?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarChecklistPecaDto)
  pecas?: RegistrarChecklistPecaDto[];
}
