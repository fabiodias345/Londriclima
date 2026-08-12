ALTER TYPE "OrdemServicoOrigem" ADD VALUE IF NOT EXISTS 'tecnico_app';
ALTER TYPE "OrdemServicoEventoAcao" ADD VALUE IF NOT EXISTS 'abrir_pelo_tecnico';
ALTER TABLE "usuarios" ADD COLUMN "tecnico_chefe" BOOLEAN NOT NULL DEFAULT false;
