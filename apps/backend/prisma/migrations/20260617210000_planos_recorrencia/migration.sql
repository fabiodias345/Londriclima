CREATE TYPE "PlanoRecorrenciaFrequencia" AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');

CREATE TABLE "planos_recorrencia" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "empresa_id" UUID NOT NULL,
  "cliente_id" UUID NOT NULL,
  "equipamento_id" UUID,
  "equipe_id" UUID,
  "tecnico_id" UUID,
  "ultimo_os_id" UUID,
  "titulo" TEXT NOT NULL,
  "detalhes" TEXT,
  "frequencia" "PlanoRecorrenciaFrequencia" NOT NULL,
  "proxima_execucao" TIMESTAMP(3) NOT NULL,
  "valor_cobrado" DECIMAL(12,2),
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "planos_recorrencia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "planos_recorrencia_empresa_id_ativo_proxima_execucao_idx" ON "planos_recorrencia"("empresa_id", "ativo", "proxima_execucao");
CREATE INDEX "planos_recorrencia_cliente_id_idx" ON "planos_recorrencia"("cliente_id");
CREATE INDEX "planos_recorrencia_equipamento_id_idx" ON "planos_recorrencia"("equipamento_id");

ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_equipamento_id_fkey" FOREIGN KEY ("equipamento_id") REFERENCES "equipamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "planos_recorrencia" ADD CONSTRAINT "planos_recorrencia_ultimo_os_id_fkey" FOREIGN KEY ("ultimo_os_id") REFERENCES "ordens_servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
