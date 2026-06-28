import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SalvarTecnicoDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: "Login deve usar apenas letras, numeros, ponto, hifen ou sublinhado." })
  login: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsIn(["admin", "tecnico", "auxiliar"])
  role?: "admin" | "tecnico" | "auxiliar";

  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;
}
