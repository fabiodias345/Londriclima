ALTER TABLE "orcamentos"
  ADD COLUMN "confirmado_em" TIMESTAMP(3),
  ADD COLUMN "confirmado_por_usuario_id" UUID;

ALTER TABLE "orcamentos"
  ADD CONSTRAINT "orcamentos_confirmado_por_usuario_id_fkey"
  FOREIGN KEY ("confirmado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "orcamento_envios" (
  "id" UUID NOT NULL,
  "orcamento_id" UUID NOT NULL,
  "pdf_hash" TEXT NOT NULL,
  "pdf_filename" TEXT NOT NULL,
  "canal" TEXT NOT NULL,
  "destinatario" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "mensagem_id" TEXT,
  "enviado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "orcamento_envios_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orcamento_envios"
  ADD CONSTRAINT "orcamento_envios_orcamento_id_fkey"
  FOREIGN KEY ("orcamento_id") REFERENCES "orcamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "orcamento_envios_orcamento_id_enviado_em_idx" ON "orcamento_envios"("orcamento_id", "enviado_em");
