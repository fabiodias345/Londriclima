import { Transform } from "class-transformer";
import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CadastrarComConviteDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9-]{8,12}$/)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  senha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nome: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/)
  login: string;

  @IsEmail()
  @MaxLength(160)
  email: string;

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
