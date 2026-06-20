import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class SalvarTecnicoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsIn(["tecnico", "auxiliar"])
  role?: "tecnico" | "auxiliar";

  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;
}
