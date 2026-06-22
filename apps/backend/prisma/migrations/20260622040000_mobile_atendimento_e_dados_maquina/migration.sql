ALTER TYPE "OrdemServicoEventoAcao" ADD VALUE IF NOT EXISTS 'iniciar_atendimento';

ALTER TABLE "equipamentos"
ADD COLUMN "dados_pendentes_justificados" JSONB;
