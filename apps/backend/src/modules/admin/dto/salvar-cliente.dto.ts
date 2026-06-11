import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class SalvarClienteDto {
  @IsOptional()
  @IsIn(["pf", "pj"])
  tipo?: "pf" | "pj";

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  cep?: string;
}
