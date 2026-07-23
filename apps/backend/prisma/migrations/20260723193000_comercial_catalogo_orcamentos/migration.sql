CREATE TYPE "CatalogoItemTipo" AS ENUM ('servico', 'material', 'peca', 'equipamento');
CREATE TYPE "OrcamentoStatus" AS ENUM ('rascunho', 'enviado', 'aprovado', 'recusado', 'expirado');

CREATE TABLE "catalogo_itens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "tipo" "CatalogoItemTipo" NOT NULL,
  "grupo" TEXT NOT NULL,
  "subgrupo" TEXT,
  "codigo" TEXT,
  "nome" TEXT NOT NULL,
  "descricao" TEXT,
  "unidade" TEXT NOT NULL,
  "custo" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalogo_itens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalogo_itens_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "catalogo_itens_empresa_id_tipo_grupo_idx" ON "catalogo_itens"("empresa_id", "tipo", "grupo");
CREATE INDEX "catalogo_itens_empresa_id_nome_idx" ON "catalogo_itens"("empresa_id", "nome");

CREATE TABLE "orcamentos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "conversa_id" UUID,
  "criado_por_usuario_id" UUID,
  "status" "OrcamentoStatus" NOT NULL DEFAULT 'rascunho',
  "titulo" TEXT NOT NULL,
  "detalhes" TEXT,
  "valido_ate" TIMESTAMP(3),
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "desconto" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "enviado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orcamentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orcamentos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "orcamentos_conversa_id_fkey" FOREIGN KEY ("conversa_id") REFERENCES "whatsapp_conversas"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "orcamentos_criado_por_usuario_id_fkey" FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "orcamentos_empresa_id_status_idx" ON "orcamentos"("empresa_id", "status");
CREATE INDEX "orcamentos_cliente_id_idx" ON "orcamentos"("cliente_id");
CREATE INDEX "orcamentos_conversa_id_idx" ON "orcamentos"("conversa_id");

CREATE TABLE "orcamento_itens" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orcamento_id" UUID NOT NULL,
  "item_catalogo_id" UUID,
  "tipo" "CatalogoItemTipo" NOT NULL,
  "descricao" TEXT NOT NULL,
  "unidade" TEXT NOT NULL,
  "quantidade" DECIMAL(12,3) NOT NULL,
  "valor_unitario" DECIMAL(12,2) NOT NULL,
  "valor_total" DECIMAL(12,2) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orcamento_itens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orcamento_itens_orcamento_id_fkey" FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "orcamento_itens_item_catalogo_id_fkey" FOREIGN KEY ("item_catalogo_id") REFERENCES "catalogo_itens"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "orcamento_itens_orcamento_id_idx" ON "orcamento_itens"("orcamento_id");
