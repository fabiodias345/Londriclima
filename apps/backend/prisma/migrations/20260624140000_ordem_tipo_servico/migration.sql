CREATE TYPE "OrdemServicoTipoServico" AS ENUM ('preventiva', 'corretiva');

ALTER TABLE "ordens_servico"
ADD COLUMN "tipo_servico" "OrdemServicoTipoServico" NOT NULL DEFAULT 'preventiva';
