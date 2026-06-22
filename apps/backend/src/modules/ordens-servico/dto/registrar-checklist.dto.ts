import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested
} from "class-validator";
import { ChecklistTipo } from "@prisma/client";

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

export class RegistrarChecklistRespostaDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  valor: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class RegistrarChecklistDto {
  @IsOptional()
  @IsUUID()
  equipamento_id?: string;

  @IsOptional()
  @IsEnum(ChecklistTipo)
  checklist_tipo?: ChecklistTipo;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarChecklistRespostaDto)
  respostas?: RegistrarChecklistRespostaDto[];
}
