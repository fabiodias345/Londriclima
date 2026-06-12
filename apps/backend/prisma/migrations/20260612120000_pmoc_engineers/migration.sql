CREATE TABLE "engenheiros_responsaveis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "nome" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "crea" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "telefone" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "engenheiros_responsaveis_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "clientes"
  ADD COLUMN "pmoc_ativo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "engenheiro_responsavel_id" UUID;

CREATE UNIQUE INDEX "engenheiros_responsaveis_empresa_id_crea_key"
  ON "engenheiros_responsaveis"("empresa_id", "crea");

CREATE INDEX "engenheiros_responsaveis_empresa_id_idx"
  ON "engenheiros_responsaveis"("empresa_id");

CREATE INDEX "clientes_empresa_id_pmoc_ativo_idx"
  ON "clientes"("empresa_id", "pmoc_ativo");

ALTER TABLE "engenheiros_responsaveis"
  ADD CONSTRAINT "engenheiros_responsaveis_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "clientes"
  ADD CONSTRAINT "clientes_engenheiro_responsavel_id_fkey"
  FOREIGN KEY ("engenheiro_responsavel_id") REFERENCES "engenheiros_responsaveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
