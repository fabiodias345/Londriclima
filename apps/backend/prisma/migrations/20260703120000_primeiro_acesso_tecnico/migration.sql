ALTER TABLE "usuarios"
  ADD COLUMN "primeiro_acesso_pendente" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "primeiro_acesso_em" TIMESTAMP(3),
  ADD COLUMN "cpf" TEXT,
  ADD COLUMN "foto_perfil_storage_url" TEXT,
  ADD COLUMN "assinatura_storage_url" TEXT;

ALTER TABLE "ordem_servico_assinaturas"
  ADD COLUMN "foto_tecnico_storage_url" TEXT;

CREATE UNIQUE INDEX "usuarios_empresa_id_cpf_key" ON "usuarios"("empresa_id", "cpf");

CREATE TABLE "funcionario_documentos" (
  "id" UUID NOT NULL,
  "empresa_id" UUID NOT NULL,
  "usuario_id" UUID NOT NULL,
  "tipo" TEXT NOT NULL,
  "versao" TEXT NOT NULL,
  "nome_funcionario" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "storage_url" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "aceito_em" TIMESTAMP(3) NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "funcionario_documentos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "funcionario_documentos_usuario_id_tipo_versao_key"
  ON "funcionario_documentos"("usuario_id", "tipo", "versao");
CREATE INDEX "funcionario_documentos_empresa_id_idx" ON "funcionario_documentos"("empresa_id");
CREATE INDEX "funcionario_documentos_usuario_id_idx" ON "funcionario_documentos"("usuario_id");
ALTER TABLE "funcionario_documentos"
  ADD CONSTRAINT "funcionario_documentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "funcionario_documentos"
  ADD CONSTRAINT "funcionario_documentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "usuarios"
SET "primeiro_acesso_pendente" = true
WHERE "role" IN ('tecnico', 'auxiliar')
  AND ("foto_perfil_storage_url" IS NULL OR "assinatura_storage_url" IS NULL);
