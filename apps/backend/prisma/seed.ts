import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const ORDEM_SERVICO_TESTE_ID = "55555555-5555-4555-8555-555555555555";
const ORDEM_SERVICO_PMOC_CONCLUIDA_ID = "5a5a5a5a-5555-4555-8555-5a5a5a5a5a5a";
const EQUIPAMENTO_TESTE_ID = "88888888-8888-4888-8888-888888888888";
const ENGENHEIRO_TESTE_ID = "99999999-9999-4999-8999-999999999999";
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
      nome: "AIRMOVEBR",
      telefone: null,
      email: null,
      ativa: true
    },
    create: {
      nome: "AIRMOVEBR",
      cnpj: "00000000000000",
      ativa: true
    }
  });

  const tecnico = await prisma.usuario.upsert({
    where: {
      empresaId_email: {
        empresaId: empresa.id,
        email: "tecnico@airmovebr.local"
      }
    },
    update: {
      nome: "João Técnico",
      login: "tecnico",
      senhaHash,
      role: "tecnico",
      ativo: true
    },
    create: {
      empresaId: empresa.id,
      nome: "João Técnico",
      login: "tecnico",
      email: "tecnico@airmovebr.local",
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

  const engenheiro = await prisma.engenheiroResponsavel.upsert({
    where: {
      id: ENGENHEIRO_TESTE_ID
    },
    update: {
      empresaId: empresa.id,
      nome: "Paulo Londriclima",
      cpf: "12345678901",
      crea: "CREA-PR 123456",
      email: "paulo@londriclima.com",
      telefone: "43999991111",
      ativo: true
    },
    create: {
      id: ENGENHEIRO_TESTE_ID,
      empresaId: empresa.id,
      nome: "Paulo Londriclima",
      cpf: "12345678901",
      crea: "CREA-PR 123456",
      email: "paulo@londriclima.com",
      telefone: "43999991111",
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
      telefone: "43988887777",
      pmocAtivo: true,
      engenheiroResponsavelId: engenheiro.id
    },
    create: {
      id: "33333333-3333-4333-8333-333333333333",
      empresaId: empresa.id,
      tipo: "pf",
      nome: "Maria Souza",
      documento: "12345678900",
      email: "maria@example.com",
      telefone: "43988887777",
      pmocAtivo: true,
      engenheiroResponsavelId: engenheiro.id
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

  const equipamento = await prisma.equipamento.upsert({
    where: {
      id: EQUIPAMENTO_TESTE_ID
    },
    update: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      tipo: "Split Hi Wall",
      patrimonio: "PMOC-MARIA-001",
      codigoBarras: "789000000001",
      marca: "LG",
      modelo: "Dual Inverter",
      capacidadeBtu: 12000,
      gasRefrigerante: "R-410A",
      numeroSerie: "LG-MARIA-12000",
      localInstalacao: "Sala principal"
    },
    create: {
      id: EQUIPAMENTO_TESTE_ID,
      empresaId: empresa.id,
      clienteId: cliente.id,
      codigoPublico: "EQ-MARIA001",
      senhaPublicaHash: await hashPassword("123456"),
      acessoPublicoAtivo: true,
      tipo: "Split Hi Wall",
      patrimonio: "PMOC-MARIA-001",
      codigoBarras: "789000000001",
      marca: "LG",
      modelo: "Dual Inverter",
      capacidadeBtu: 12000,
      gasRefrigerante: "R-410A",
      numeroSerie: "LG-MARIA-12000",
      localInstalacao: "Sala principal"
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
      equipamentoId: equipamento.id,
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
      equipamentoId: equipamento.id,
      equipeId: equipe.id,
      tecnicoId: tecnico.id,
      status: "aberta",
      titulo: "Limpeza preventiva de ar-condicionado",
      problemaRelatado: "Cliente solicitou limpeza completa e revisão preventiva.",
      agendadaPara: new Date("2026-06-10T12:00:00.000Z")
    }
  });

  const checklistPmocExistente = await prisma.ordemServicoChecklist.findUnique({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    },
    select: {
      id: true
    }
  });

  if (checklistPmocExistente) {
    await prisma.ordemServicoPeca.deleteMany({
      where: {
        checklistId: checklistPmocExistente.id
      }
    });
  }

  await prisma.automacaoAgendada.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });
  await prisma.ordemServicoObservacao.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });
  await prisma.ordemServicoAssinatura.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });
  await prisma.ordemServicoChecklist.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });
  await prisma.ordemServicoEvidencia.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });
  await prisma.ordemServicoEvento.deleteMany({
    where: {
      ordemServicoId: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    }
  });

  const ordemPmocConcluida = await prisma.ordemServico.upsert({
    where: {
      id: ORDEM_SERVICO_PMOC_CONCLUIDA_ID
    },
    update: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      enderecoId: endereco.id,
      equipamentoId: equipamento.id,
      equipeId: equipe.id,
      tecnicoId: tecnico.id,
      status: "concluida",
      titulo: "PMOC mensal - Maria Souza",
      problemaRelatado: "Execucao mensal do PMOC com higienizacao, verificacoes operacionais e evidencias.",
      agendadaPara: new Date("2026-06-11T12:00:00.000Z"),
      concluidaEm: new Date("2026-06-11T15:20:00.000Z")
    },
    create: {
      id: ORDEM_SERVICO_PMOC_CONCLUIDA_ID,
      empresaId: empresa.id,
      clienteId: cliente.id,
      enderecoId: endereco.id,
      equipamentoId: equipamento.id,
      equipeId: equipe.id,
      tecnicoId: tecnico.id,
      status: "concluida",
      titulo: "PMOC mensal - Maria Souza",
      problemaRelatado: "Execucao mensal do PMOC com higienizacao, verificacoes operacionais e evidencias.",
      agendadaPara: new Date("2026-06-11T12:00:00.000Z"),
      concluidaEm: new Date("2026-06-11T15:20:00.000Z")
    }
  });

  await prisma.ordemServicoEvento.createMany({
    data: [
      {
        empresaId: empresa.id,
        ordemServicoId: ordemPmocConcluida.id,
        usuarioId: tecnico.id,
        acao: "cheguei_cliente",
        statusAnterior: "em_deslocamento",
        statusNovo: "em_atendimento",
        latitude: -23.3045,
        longitude: -51.1696,
        registradoEm: new Date("2026-06-11T12:10:00.000Z")
      },
      {
        empresaId: empresa.id,
        ordemServicoId: ordemPmocConcluida.id,
        usuarioId: tecnico.id,
        acao: "finalizar",
        statusAnterior: "em_atendimento",
        statusNovo: "concluida",
        latitude: -23.3047,
        longitude: -51.1697,
        registradoEm: new Date("2026-06-11T15:20:00.000Z")
      }
    ]
  });

  await prisma.ordemServicoEvidencia.createMany({
    data: [
      {
        empresaId: empresa.id,
        ordemServicoId: ordemPmocConcluida.id,
        tipo: "antes",
        descricao: "Filtro com acumulacao leve de poeira antes da higienizacao.",
        storageUrl: "/storage/demo/maria/antes.webp",
        mimeType: "image/webp",
        tamanhoBytes: 128000
      },
      {
        empresaId: empresa.id,
        ordemServicoId: ordemPmocConcluida.id,
        tipo: "depois",
        descricao: "Equipamento limpo, operando normalmente apos manutencao.",
        storageUrl: "/storage/demo/maria/depois.webp",
        mimeType: "image/webp",
        tamanhoBytes: 126000
      }
    ]
  });

  const checklistPmoc = await prisma.ordemServicoChecklist.create({
    data: {
      empresaId: empresa.id,
      ordemServicoId: ordemPmocConcluida.id,
      servicoRealizado: "PMOC mensal executado com limpeza de filtro, verificacao de dreno, evaporadora, funcionamento eletrico e leitura operacional.",
      procedimentos: ["limpeza_filtro", "verificacao_dreno", "verificacao_eletrica", "teste_operacional"],
      custoTotalPecas: 0
    }
  });

  await prisma.ordemServicoPeca.create({
    data: {
      empresaId: empresa.id,
      checklistId: checklistPmoc.id,
      descricaoPeca: "Produto higienizante",
      quantidade: 1,
      custoUnitario: 18
    }
  });

  await prisma.ordemServicoObservacao.create({
    data: {
      empresaId: empresa.id,
      ordemServicoId: ordemPmocConcluida.id,
      texto: "Equipamento em bom estado. Manter rotina mensal do PMOC.",
      visivelNoRelatorio: true
    }
  });

  await prisma.ordemServicoAssinatura.create({
    data: {
      empresaId: empresa.id,
      ordemServicoId: ordemPmocConcluida.id,
      nomeResponsavel: "Maria Souza",
      storageUrl: "/storage/demo/maria/assinatura.png",
      latitude: -23.3047,
      longitude: -51.1697,
      assinadoEm: new Date("2026-06-11T15:20:00.000Z")
    }
  });

  await prisma.veiculoLocalizacao.deleteMany({
    where: {
      veiculoId: {
        in: [VEICULO_1_ID, VEICULO_2_ID]
      }
    }
  });
  await prisma.veiculoAbastecimento.deleteMany({
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
        latitude: -23.2865,
        longitude: -51.1698,
        velocidadeKmh: 32,
        ignicao: true,
        registradoEm: new Date()
      },
      {
        empresaId: empresa.id,
        veiculoId: veiculo2.id,
        latitude: -23.3385,
        longitude: -51.1865,
        velocidadeKmh: 0,
        ignicao: false,
        registradoEm: new Date(Date.now() - 7 * 60 * 1000)
      }
    ]
  });

  await prisma.veiculoAbastecimento.createMany({
    data: [
      {
        empresaId: empresa.id,
        veiculoId: veiculo1.id,
        usuarioId: tecnico.id,
        odometroKm: 51200,
        litros: 42,
        valorTotal: 247.8,
        precoPorLitro: 5.9,
        abastecidoEm: new Date("2026-06-01T11:00:00.000Z"),
        posto: "Posto Centro"
      },
      {
        empresaId: empresa.id,
        veiculoId: veiculo1.id,
        usuarioId: tecnico.id,
        odometroKm: 51635,
        litros: 40.5,
        valorTotal: 238.95,
        precoPorLitro: 5.9,
        abastecidoEm: new Date("2026-06-08T11:20:00.000Z"),
        posto: "Posto Centro"
      },
      {
        empresaId: empresa.id,
        veiculoId: veiculo2.id,
        usuarioId: tecnico.id,
        odometroKm: 38440,
        litros: 38,
        valorTotal: 224.2,
        precoPorLitro: 5.9,
        abastecidoEm: new Date("2026-06-02T10:30:00.000Z"),
        posto: "Posto Gleba"
      },
      {
        empresaId: empresa.id,
        veiculoId: veiculo2.id,
        usuarioId: tecnico.id,
        odometroKm: 38778,
        litros: 36,
        valorTotal: 212.4,
        precoPorLitro: 5.9,
        abastecidoEm: new Date("2026-06-09T10:10:00.000Z"),
        posto: "Posto Gleba"
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
