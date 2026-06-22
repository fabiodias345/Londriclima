CREATE TYPE "ChecklistTipo" AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');

ALTER TABLE "ordens_servico"
ADD COLUMN "checklist_tipo" "ChecklistTipo" NOT NULL DEFAULT 'mensal';

ALTER TABLE "planos_recorrencia"
ADD COLUMN "checklist_tipo" "ChecklistTipo" NOT NULL DEFAULT 'mensal';
