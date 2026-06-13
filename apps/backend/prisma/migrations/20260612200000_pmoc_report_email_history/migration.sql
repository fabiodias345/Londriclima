ALTER TABLE "pmoc_relatorios"
  ADD COLUMN "email_cliente" TEXT,
  ADD COLUMN "email_agendado_em" TIMESTAMP(3),
  ADD COLUMN "historico_finalizado_em" TIMESTAMP(3);
