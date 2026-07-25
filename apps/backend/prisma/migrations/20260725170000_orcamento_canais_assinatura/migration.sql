ALTER TABLE "orcamentos"
  ADD COLUMN "pdf_gerado_em" TIMESTAMP(3),
  ADD COLUMN "ultimo_envio_canal" TEXT,
  ADD COLUMN "ultimo_envio_em" TIMESTAMP(3),
  ADD COLUMN "email_envio" TEXT,
  ADD COLUMN "assinafy_document_id" TEXT,
  ADD COLUMN "assinafy_assignment_id" TEXT,
  ADD COLUMN "assinafy_status" TEXT,
  ADD COLUMN "assinafy_ultimo_evento" JSONB,
  ADD COLUMN "assinafy_iniciado_em" TIMESTAMP(3);

CREATE UNIQUE INDEX "orcamentos_assinafy_document_id_key"
  ON "orcamentos"("assinafy_document_id");
