import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class SalvarEquipeMembroDto {
  @IsUUID()
  usuario_id: string;

  @IsIn(["lider", "tecnico", "auxiliar"])
  funcao: "lider" | "tecnico" | "auxiliar";
}

export class SalvarEquipeDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  cliente_ids?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalvarEquipeMembroDto)
  membros?: SalvarEquipeMembroDto[];
}
