import { IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";

export class SalvarEmpresaDto {
  @IsOptional()
  @IsString()
  razao_social?: string;

  @IsOptional()
  @IsString()
  nome_fantasia?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
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
  cidade?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  uf?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  inscricao_estadual?: string;

  @IsOptional()
  @IsString()
  inscricao_municipal?: string;

  @IsOptional()
  @IsString()
  responsavel_legal?: string;

  @IsOptional()
  @IsString()
  responsavel_cpf?: string;

  @IsOptional()
  @IsString()
  contato_principal?: string;

  @IsOptional()
  @IsString()
  contato_cargo?: string;

  @IsOptional()
  @IsIn(["ativa", "suspensa", "inativa"])
  status?: "ativa" | "suspensa" | "inativa";

  @IsOptional()
  @IsString()
  observacoes?: string;
}
