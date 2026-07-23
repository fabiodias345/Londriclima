import { IsArray, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";
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
