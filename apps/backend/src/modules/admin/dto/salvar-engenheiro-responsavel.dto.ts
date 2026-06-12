import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class SalvarEngenheiroResponsavelDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsString()
  @IsNotEmpty()
  crea: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
