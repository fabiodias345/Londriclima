-- CreateTable
CREATE TABLE "veiculos" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "placa" TEXT,
    "rastreador_imei" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculo_localizacoes" (
    "id" UUID NOT NULL,
    "empresa_id" UUID NOT NULL,
    "veiculo_id" UUID NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "velocidade_kmh" DECIMAL(8,2),
    "ignicao" BOOLEAN,
    "registrado_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veiculo_localizacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_rastreador_imei_key" ON "veiculos"("rastreador_imei");

-- CreateIndex
CREATE INDEX "veiculos_empresa_id_idx" ON "veiculos"("empresa_id");

-- CreateIndex
CREATE INDEX "veiculo_localizacoes_empresa_id_registrado_em_idx" ON "veiculo_localizacoes"("empresa_id", "registrado_em");

-- CreateIndex
CREATE INDEX "veiculo_localizacoes_veiculo_id_registrado_em_idx" ON "veiculo_localizacoes"("veiculo_id", "registrado_em");

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo_localizacoes" ADD CONSTRAINT "veiculo_localizacoes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculo_localizacoes" ADD CONSTRAINT "veiculo_localizacoes_veiculo_id_fkey" FOREIGN KEY ("veiculo_id") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
