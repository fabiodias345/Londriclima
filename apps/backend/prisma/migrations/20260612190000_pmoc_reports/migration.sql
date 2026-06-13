CREATE TYPE "PmocRelatorioStatus" AS ENUM ('gerado', 'aguardando_assinatura_engenheiro', 'assinado', 'cancelado');

CREATE TABLE "pmoc_relatorios" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "engenheiro_responsavel_id" UUID NOT NULL,
  "criado_por_usuario_id" UUID NOT NULL,
  "status" "PmocRelatorioStatus" NOT NULL DEFAULT 'gerado',
  "token_assinatura" TEXT NOT NULL,
  "pdf_hash" TEXT NOT NULL,
  "pdf_storage_url" TEXT,
  "assinado_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pmoc_relatorios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmoc_relatorios_token_assinatura_key"
  ON "pmoc_relatorios"("token_assinatura");

CREATE INDEX "pmoc_relatorios_empresa_id_cliente_id_idx"
  ON "pmoc_relatorios"("empresa_id", "cliente_id");

CREATE INDEX "pmoc_relatorios_empresa_id_status_idx"
  ON "pmoc_relatorios"("empresa_id", "status");

ALTER TABLE "pmoc_relatorios"
  ADD CONSTRAINT "pmoc_relatorios_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pmoc_relatorios"
  ADD CONSTRAINT "pmoc_relatorios_cliente_id_fkey"
  FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pmoc_relatorios"
  ADD CONSTRAINT "pmoc_relatorios_engenheiro_responsavel_id_fkey"
  FOREIGN KEY ("engenheiro_responsavel_id") REFERENCES "engenheiros_responsaveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pmoc_relatorios"
  ADD CONSTRAINT "pmoc_relatorios_criado_por_usuario_id_fkey"
  FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
