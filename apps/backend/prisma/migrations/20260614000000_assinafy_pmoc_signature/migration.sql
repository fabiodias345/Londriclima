ALTER TABLE "pmoc_relatorios"
  ADD COLUMN "assinafy_document_id" TEXT,
  ADD COLUMN "assinafy_assignment_id" TEXT,
  ADD COLUMN "assinafy_status" TEXT,
  ADD COLUMN "assinafy_ultimo_evento" JSONB;

CREATE UNIQUE INDEX "pmoc_relatorios_assinafy_document_id_key"
  ON "pmoc_relatorios"("assinafy_document_id");
