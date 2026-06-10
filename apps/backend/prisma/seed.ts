import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const ORDEM_SERVICO_TESTE_ID = "55555555-5555-4555-8555-555555555555";
const VEICULO_1_ID = "66666666-6666-4666-8666-666666666666";
const VEICULO_2_ID = "77777777-7777-4777-8777-777777777777";
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const senhaTecnico = "123456";
  const senhaHash = await hashPassword(senhaTecnico);
  const empresa = await prisma.empresa.upsert({
    where: {
      cnpj: "00000000000000"
    },
    update: {
      nome: "LondriClima",
      telefone: null,
      email: null,
      ativa: true
    },
    create: {
      nome: "LondriClima",
      cnpj: "00000000000000",
      ativa: true
    }
  });

  const tecnico = await prisma.usuario.upsert({
    where: {
      empresaId_email: {
        empresaId: empresa.id,
        email: "tecnico@londriclima.local"
      }
    },
    update: {
      nome: "João Técnico",
      senhaHash,
      role: "tecnico",
      ativo: true
    },
    create: {
      empresaId: empresa.id,
      nome: "João Técnico",
      email: "tecnico@londriclima.local",
      senhaHash,
      role: "tecnico",
      ativo: true
    }
  });

  const equipe = await prisma.equipe.upsert({
    where: {
      id: "11111111-1111-4111-8111-111111111111"
    },
    update: {
      empresaId: empresa.id,
      nome: "Equipe Técnica 01",
      tecnicoId: tecnico.id,
      ativa: true
    },
    create: {
      id: "11111111-1111-4111-8111-111111111111",
      empresaId: empresa.id,
      nome: "Equipe Técnica 01",
      tecnicoId: tecnico.id,
      ativa: true
    }
  });

  await prisma.equipeAuxiliar.upsert({
    where: {
      id: "22222222-2222-4222-8222-222222222222"
    },
    update: {
      empresaId: empresa.id,
      equipeId: equipe.id,
      nome: "Carlos Auxiliar",
      telefone: "43999990000",
      ativo: true
    },
    create: {
      id: "22222222-2222-4222-8222-222222222222",
      empresaId: empresa.id,
      equipeId: equipe.id,
      nome: "Carlos Auxiliar",
      telefone: "43999990000",
      ativo: true
    }
  });

  const cliente = await prisma.cliente.upsert({
    where: {
      id: "33333333-3333-4333-8333-333333333333"
    },
    update: {
      empresaId: empresa.id,
      tipo: "pf",
      nome: "Maria Souza",
      documento: "12345678900",
      email: "maria@example.com",
      telefone: "43988887777"
    },
    create: {
      id: "33333333-3333-4333-8333-333333333333",
      empresaId: empresa.id,
      tipo: "pf",
      nome: "Maria Souza",
      documento: "12345678900",
      email: "maria@example.com",
      telefone: "43988887777"
    }
  });

  const endereco = await prisma.clienteEndereco.upsert({
    where: {
      id: "44444444-4444-4444-8444-444444444444"
    },
    update: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      nome: "Casa",
      logradouro: "Rua de Teste",
      numero: "123",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "PR",
      cep: "86000000",
      latitude: -23.3045,
      longitude: -51.1696,
      principal: true
    },
    create: {
      id: "44444444-4444-4444-8444-444444444444",
      empresaId: empresa.id,
      clienteId: cliente.id,
      nome: "Casa",
      logradouro: "Rua de Teste",
      numero: "123",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "PR",
      cep: "86000000",
      latitude: -23.3045,
      longitude: -51.1696,
      principal: true
    }
  });

  const checklistExistente = await prisma.ordemServicoChecklist.findUnique({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    },
    select: {
      id: true
    }
  });

  if (checklistExistente) {
    await prisma.ordemServicoPeca.deleteMany({
      where: {
        checklistId: checklistExistente.id
      }
    });
  }

  await prisma.automacaoAgendada.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });
  await prisma.ordemServicoObservacao.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });
  await prisma.ordemServicoAssinatura.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });
  await prisma.ordemServicoChecklist.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });
  await prisma.ordemServicoEvidencia.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });
  await prisma.ordemServicoEvento.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_TESTE_ID
    }
  });

  const ordemServico = await prisma.ordemServico.upsert({
    where: {
      id: ORDEM_SERVICO_TESTE_ID
    },
    update: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      enderecoId: endereco.id,
      equipeId: equipe.id,
      tecnicoId: tecnico.id,
      status: "aberta",
      titulo: "Limpeza preventiva de ar-condicionado",
      problemaRelatado: "Cliente solicitou limpeza completa e revisão preventiva.",
      agendadaPara: new Date("2026-06-10T12:00:00.000Z")
    },
    create: {
      id: ORDEM_SERVICO_TESTE_ID,
      empresaId: empresa.id,
      clienteId: cliente.id,
      enderecoId: endereco.id,
      equipeId: equipe.id,
      tecnicoId: tecnico.id,
      status: "aberta",
      titulo: "Limpeza preventiva de ar-condicionado",
      problemaRelatado: "Cliente solicitou limpeza completa e revisão preventiva.",
      agendadaPara: new Date("2026-06-10T12:00:00.000Z")
    }
  });

  await prisma.veiculoLocalizacao.deleteMany({
    where: {
      veiculoId: {
        in: [VEICULO_1_ID, VEICULO_2_ID]
      }
    }
  });

  const veiculo1 = await prisma.veiculo.upsert({
    where: {
      id: VEICULO_1_ID
    },
    update: {
      empresaId: empresa.id,
      nome: "Carro 01 - Manutencao",
      placa: "LDC1A23",
      rastreadorImei: "860000000000001",
      ativo: true
    },
    create: {
      id: VEICULO_1_ID,
      empresaId: empresa.id,
      nome: "Carro 01 - Manutencao",
      placa: "LDC1A23",
      rastreadorImei: "860000000000001",
      ativo: true
    }
  });

  const veiculo2 = await prisma.veiculo.upsert({
    where: {
      id: VEICULO_2_ID
    },
    update: {
      empresaId: empresa.id,
      nome: "Carro 02 - Instalacao",
      placa: "LDC2B34",
      rastreadorImei: "860000000000002",
      ativo: true
    },
    create: {
      id: VEICULO_2_ID,
      empresaId: empresa.id,
      nome: "Carro 02 - Instalacao",
      placa: "LDC2B34",
      rastreadorImei: "860000000000002",
      ativo: true
    }
  });

  await prisma.veiculoLocalizacao.createMany({
    data: [
      {
        empresaId: empresa.id,
        veiculoId: veiculo1.id,
        latitude: -23.3045,
        longitude: -51.1696,
        velocidadeKmh: 32,
        ignicao: true,
        registradoEm: new Date()
      },
      {
        empresaId: empresa.id,
        veiculoId: veiculo2.id,
        latitude: -23.3278,
        longitude: -51.1469,
        velocidadeKmh: 0,
        ignicao: false,
        registradoEm: new Date(Date.now() - 7 * 60 * 1000)
      }
    ]
  });

  console.log(`Empresa piloto pronta: ${empresa.nome} (${empresa.id})`);
  console.log(`Técnico de teste: ${tecnico.email} / senha ${senhaTecnico} (${tecnico.id})`);
  console.log(`OS de teste aberta: ${ordemServico.id}`);
  console.log(`Frota de teste pronta: ${veiculo1.nome}, ${veiculo2.nome}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
