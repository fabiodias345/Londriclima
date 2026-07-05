ALTER TABLE "convites_tecnico" ALTER COLUMN "criado_por_id" DROP NOT NULL;
ALTER TABLE "pmoc_relatorios" ALTER COLUMN "criado_por_usuario_id" DROP NOT NULL;

ALTER TABLE "convites_tecnico" DROP CONSTRAINT "convites_tecnico_criado_por_id_fkey";
ALTER TABLE "convites_tecnico" ADD CONSTRAINT "convites_tecnico_criado_por_id_fkey"
  FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "funcionario_documentos" DROP CONSTRAINT "funcionario_documentos_usuario_id_fkey";
ALTER TABLE "funcionario_documentos" ADD CONSTRAINT "funcionario_documentos_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "equipe_membros" DROP CONSTRAINT "equipe_membros_usuario_id_fkey";
ALTER TABLE "equipe_membros" ADD CONSTRAINT "equipe_membros_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ordem_servico_responsaveis" DROP CONSTRAINT "ordem_servico_responsaveis_usuario_id_fkey";
ALTER TABLE "ordem_servico_responsaveis" ADD CONSTRAINT "ordem_servico_responsaveis_usuario_id_fkey"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pmoc_relatorios" DROP CONSTRAINT "pmoc_relatorios_criado_por_usuario_id_fkey";
ALTER TABLE "pmoc_relatorios" ADD CONSTRAINT "pmoc_relatorios_criado_por_usuario_id_fkey"
  FOREIGN KEY ("criado_por_usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
