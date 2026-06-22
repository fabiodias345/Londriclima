import { OrdemServicoEventoAcao, OrdemServicoStatus, PessoaTipo, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tecnico = await prisma.usuario.findFirst({
    where: { email: "tecnico@airmovebr.local", ativo: true },
    include: { empresa: true }
  });

  if (!tecnico) {
    throw new Error("Tecnico demo tecnico@airmovebr.local nao encontrado.");
  }

  const cliente = await obterOuCriarCliente(tecnico.empresaId);
  const endereco = await obterOuCriarEndereco(tecnico.empresaId, cliente.id);
  const equipamentos = await obterOuCriarEquipamentos(tecnico.empresaId, cliente.id);
  const ordem = await obterOuCriarOs(tecnico.empresaId, cliente.id, endereco.id, equipamentos[0].id, tecnico.id);

  console.log(JSON.stringify({
    tecnico: tecnico.email,
    cliente: cliente.nome,
    equipamentos: equipamentos.length,
    os: ordem.id,
    status: ordem.status
  }, null, 2));
}

async function obterOuCriarCliente(empresaId: string) {
  const existente = await prisma.cliente.findFirst({
    where: { empresaId, nome: "Hospital Norte - Demo Mobile" }
  });

  if (existente) {
    return existente;
  }

  return prisma.cliente.create({
    data: {
      empresaId,
      tipo: PessoaTipo.pj,
      nome: "Hospital Norte - Demo Mobile",
      documento: "11222333000144",
      telefone: "43999990000",
      email: "mobile-demo@hospitalnorte.local",
      pmocAtivo: true
    }
  });
}

async function obterOuCriarEndereco(empresaId: string, clienteId: string) {
  const existente = await prisma.clienteEndereco.findFirst({ where: { empresaId, clienteId } });
  if (existente) {
    return existente;
  }

  return prisma.clienteEndereco.create({
    data: {
      empresaId,
      clienteId,
      nome: "Unidade principal",
      logradouro: "Av. Santos Dumont",
      numero: "1480",
      bairro: "Centro",
      cidade: "Londrina",
      uf: "PR",
      principal: true
    }
  });
}

async function obterOuCriarEquipamentos(empresaId: string, clienteId: string) {
  const specs = [
    ["Evaporadora sala 101", "Split Hi-Wall", 24000],
    ["Evaporadora sala 102", "Split Hi-Wall", 24000],
    ["Condensadora cobertura", "Condensadora", 24000]
  ] as const;

  const equipamentos = [];
  for (const [localInstalacao, modelo, capacidadeBtu] of specs) {
    const existente = await prisma.equipamento.findFirst({
      where: { empresaId, clienteId, localInstalacao, modelo }
    });

    equipamentos.push(existente ?? await prisma.equipamento.create({
      data: {
        empresaId,
        clienteId,
        tipo: "Ar-condicionado",
        marca: "LG",
        modelo,
        capacidadeBtu,
        gasRefrigerante: "R-410A",
        localInstalacao
      }
    }));
  }

  return equipamentos;
}

async function obterOuCriarOs(empresaId: string, clienteId: string, enderecoId: string, equipamentoId: string, tecnicoId: string) {
  const existente = await prisma.ordemServico.findFirst({
    where: {
      empresaId,
      clienteId,
      tecnicoId,
      titulo: "Limpeza mensal de filtros - Demo Mobile",
      status: { in: [OrdemServicoStatus.aberta, OrdemServicoStatus.em_deslocamento, OrdemServicoStatus.em_atendimento] }
    }
  });

  if (existente) {
    return existente;
  }

  const ordem = await prisma.ordemServico.create({
    data: {
      empresaId,
      clienteId,
      enderecoId,
      equipamentoId,
      tecnicoId,
      status: OrdemServicoStatus.aberta,
      titulo: "Limpeza mensal de filtros - Demo Mobile",
      problemaRelatado: "Manutencao mensal preventiva para limpeza de filtros.",
      agendadaPara: new Date()
    }
  });

  await prisma.ordemServicoEvento.create({
    data: {
      empresaId,
      ordemServicoId: ordem.id,
      usuarioId: tecnicoId,
      acao: OrdemServicoEventoAcao.aprovar,
      statusNovo: OrdemServicoStatus.aberta,
      registradoEm: new Date()
    }
  });

  return ordem;
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
