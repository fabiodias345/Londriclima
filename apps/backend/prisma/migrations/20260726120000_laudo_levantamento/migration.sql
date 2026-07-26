CREATE TYPE "LimpezaRecomendada" AS ENUM ('nao_recomendada', 'recomendada', 'urgente');
CREATE TYPE "LevantamentoDecisao" AS ENUM ('precisa_orcamento', 'resolvido_na_visita');
CREATE TYPE "AutorizacaoLevantamentoStatus" AS ENUM ('aguardando', 'aprovada', 'recusada', 'expirada');

ALTER TABLE "levantamentos_tecnicos"
  ADD COLUMN "diagnostico" TEXT,
  ADD COLUMN "causa_provavel" TEXT,
  ADD COLUMN "servicos_recomendados" TEXT,
  ADD COLUMN "observacoes" TEXT,
  ADD COLUMN "limpeza_recomendada" "LimpezaRecomendada" NOT NULL DEFAULT 'nao_recomendada',
  ADD COLUMN "decisao" "LevantamentoDecisao",
  ADD COLUMN "laudo_rascunho_em" TIMESTAMP(3),
  ADD COLUMN "laudo_finalizado_em" TIMESTAMP(3),
  ADD COLUMN "laudo_finalizado_por_id" UUID,
  ADD COLUMN "reaberto_em" TIMESTAMP(3),
  ADD COLUMN "reaberto_por_id" UUID,
  ADD COLUMN "motivo_reabertura" TEXT;

CREATE TABLE "levantamentos_itens_tecnicos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "levantamento_id" UUID NOT NULL,
  "descricao" TEXT NOT NULL,
  "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "observacoes" TEXT,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "levantamentos_itens_tecnicos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "levantamentos_fotos" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "levantamento_id" UUID NOT NULL,
  "criado_por_id" UUID,
  "url" TEXT NOT NULL,
  "legenda" TEXT,
  "mime_type" TEXT NOT NULL,
  "tamanho_bytes" INTEGER NOT NULL,
  "limpeza" BOOLEAN NOT NULL DEFAULT false,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "levantamentos_fotos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "levantamentos_autorizacoes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "levantamento_id" UUID NOT NULL,
  "status" "AutorizacaoLevantamentoStatus" NOT NULL DEFAULT 'aguardando',
  "valor" DECIMAL(12,2),
  "expira_em" TIMESTAMP(3) NOT NULL,
  "autorizada_em" TIMESTAMP(3),
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "levantamentos_autorizacoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "levantamentos_autorizacoes_levantamento_id_key" ON "levantamentos_autorizacoes"("levantamento_id");
CREATE INDEX "levantamentos_itens_tecnicos_levantamento_id_idx" ON "levantamentos_itens_tecnicos"("levantamento_id");
CREATE INDEX "levantamentos_fotos_levantamento_id_limpeza_idx" ON "levantamentos_fotos"("levantamento_id", "limpeza");
CREATE INDEX "levantamentos_autorizacoes_status_expira_em_idx" ON "levantamentos_autorizacoes"("status", "expira_em");

ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_laudo_finalizado_por_id_fkey" FOREIGN KEY ("laudo_finalizado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "levantamentos_tecnicos" ADD CONSTRAINT "levantamentos_tecnicos_reaberto_por_id_fkey" FOREIGN KEY ("reaberto_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "levantamentos_itens_tecnicos" ADD CONSTRAINT "levantamentos_itens_tecnicos_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_tecnicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "levantamentos_fotos" ADD CONSTRAINT "levantamentos_fotos_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_tecnicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "levantamentos_fotos" ADD CONSTRAINT "levantamentos_fotos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "levantamentos_autorizacoes" ADD CONSTRAINT "levantamentos_autorizacoes_levantamento_id_fkey" FOREIGN KEY ("levantamento_id") REFERENCES "levantamentos_tecnicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
