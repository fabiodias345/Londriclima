import { IsArray, IsDateString, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class SalvarItemCatalogoDto {
  @IsIn(["servico", "material", "peca", "equipamento"])
  tipo: "servico" | "material" | "peca" | "equipamento";

  @IsString()
  @IsNotEmpty()
  grupo: string;

  @IsOptional()
  @IsString()
  subgrupo?: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  codigo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  @IsNotEmpty()
  unidade: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  custo: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor: number;
}

export class ItemOrcamentoDto {
  @IsOptional()
  @IsUUID()
  item_catalogo_id?: string;

  @IsIn(["servico", "material", "peca", "equipamento"])
  tipo: "servico" | "material" | "peca" | "equipamento";

  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsString()
  @IsNotEmpty()
  unidade: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  @Max(100000)
  quantidade: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  valor_unitario: number;
}

export class CriarOrcamentoDto {
  @IsUUID()
  ordem_servico_id: string;

  @IsUUID()
  cliente_id: string;

  @IsOptional()
  @IsUUID()
  conversa_id?: string;

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  detalhes?: string;

  @IsOptional()
  @IsString()
  valido_ate?: string;

  @IsOptional()
  @IsDateString()
  agendada_para?: string;

  @IsOptional()
  @IsUUID()
  equipe_id?: string;

  @IsOptional()
  @IsUUID()
  tecnico_id?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  desconto?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemOrcamentoDto)
  itens: ItemOrcamentoDto[];
}

export class AtualizarStatusOrcamentoDto {
  @IsIn(["em_negociacao", "aprovado", "recusado"])
  status: "em_negociacao" | "aprovado" | "recusado";

  @IsOptional()
  @IsIn(["whatsapp", "email", "telefone"])
  canal?: "whatsapp" | "email" | "telefone";

  @IsOptional()
  @IsString()
  responsavel?: string;
}

export class EnviarOrcamentoEmailDto {
  @IsOptional()
  @IsEmail()
  destinatario?: string;
}

export class ConfirmarOrcamentoDto {
  @IsIn([true])
  confirmado!: true;
}

export class AgendarVisitaOrcamentoDto {
  @IsString()
  @IsNotEmpty()
  problema!: string;

  @IsOptional()
  @IsIn(["manutencao_preventiva", "manutencao_corretiva", "instalacao", "pmoc", "outros"])
  tipo_servico?: string;

  @IsDateString()
  agendada_para!: string;

  @IsOptional()
  @IsUUID()
  equipe_id?: string;

  @IsOptional()
  @IsUUID()
  tecnico_id?: string;
}