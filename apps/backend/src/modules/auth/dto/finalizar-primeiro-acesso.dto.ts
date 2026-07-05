import { Transform } from "class-transformer";
import { IsBoolean, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class FinalizarPrimeiroAcessoDto {
  @IsString()
  @IsNotEmpty()
  onboarding_token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  senha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsString()
  @Matches(/^\d{11}$/)
  cpf: string;

  @IsString()
  @Matches(/^\d{10,11}$/)
  telefone: string;

  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  termo_aceito: boolean;
}
