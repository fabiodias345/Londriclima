CREATE TABLE "veiculo_abastecimentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "empresa_id" UUID NOT NULL,
    "veiculo_id" UUID NOT NULL,
    "usuario_id" UUID,
    "odometro_km" DECIMAL(12,1) NOT NULL,
    "litros" DECIMAL(10,3) NOT NULL,
    "valor_total" DECIMAL(12,2) NOT NULL,
    "preco_por_litro" DECIMAL(12,3) NOT NULL,
    "abastecido_em" TIMESTAMP(3) NOT NULL,
    "posto" TEXT,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_abastecimentos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "veiculo_abastecimentos_empresa_id_abastecido_em_idx" ON "veiculo_abastecimentos"("empresa_id", "abastecido_em");
CREATE INDEX "veiculo_abastecimentos_veiculo_id_abastecido_em_idx" ON "veiculo_abastecimentos"("veiculo_id", "abastecido_em");
CREATE INDEX "veiculo_abastecimentos_veiculo_id_odometro_km_idx" ON "veiculo_abastecimentos"("veiculo_id", "odometro_km");

ALTER TABLE "veiculo_abastecimentos" ADD CONSTRAINT "veiculo_abastecimentos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "veiculo_abastecimentos" ADD CONSTRAINT "veiculo_abastecimentos_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "veiculo_abastecimentos" ADD CONSTRAINT "veiculo_abastecimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
