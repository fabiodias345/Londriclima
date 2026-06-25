import {
OrdemServicoStatus,
UsuarioRole
} from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AdminService } from "./admin.service";
import { AdminAgendaService } from "./services/admin-agenda.service";
import { AdminClientesService } from "./services/admin-clientes.service";
import { AdminEngenheirosService } from "./services/admin-engenheiros.service";
import { AdminEquipamentosService } from "./services/admin-equipamentos.service";
import { AdminEquipesService } from "./services/admin-equipes.service";
import { AdminFrotaService } from "./services/admin-frota.service";
import { AdminPmocPdfService } from "./services/admin-pmoc-pdf.service";
import { AdminPmocService } from "./services/admin-pmoc.service";
import { AdminPreChamadosService } from "./services/admin-pre-chamados.service";
import { AdminRecorrenciaService } from "./services/admin-recorrencia.service";
import { AdminRelatoriosService } from "./services/admin-relatorios.service";
import { AdminTecnicosService } from "./services/admin-tecnicos.service";

const usuario = {
  id: "admin-1",
  empresa_id: "empresa-1",
  email: "admin@airmovebr.local",
  role: UsuarioRole.admin
};

function criarService(prisma: unknown) {
  return new AdminService(prisma as never);
}

test("AdminService delega agenda e recorrencias para services especializados", async () => {
  const agendaService = {
    listarAgenda: async (user: typeof usuario) => ({ metodo: "listarAgenda", user }),
    criarOrdemAgenda: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarOrdemAgenda", dto, user }),
    reprogramarOrdemAgenda: async (osId: string, dto: unknown, user: typeof usuario) => ({ metodo: "reprogramarOrdemAgenda", osId, dto, user })
  } as unknown as AdminAgendaService;
  const recorrenciaService = {
    listarPlanosRecorrencia: async (user: typeof usuario) => ({ metodo: "listarPlanosRecorrencia", user }),
    criarPlanoRecorrencia: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarPlanoRecorrencia", dto, user }),
    atualizarPlanoRecorrencia: async (planoId: string, dto: unknown, user: typeof usuario) => ({ metodo: "atualizarPlanoRecorrencia", planoId, dto, user }),
    gerarOrdemPlanoRecorrencia: async (planoId: string, user: typeof usuario) => ({ metodo: "gerarOrdemPlanoRecorrencia", planoId, user })
  } as unknown as AdminRecorrenciaService;
  const service = new AdminService({} as never, undefined, agendaService, recorrenciaService);

  assert.deepEqual(await service.listarAgenda(usuario), { metodo: "listarAgenda", user: usuario });
  assert.deepEqual(await service.criarOrdemAgenda({ titulo: "OS" } as never, usuario), { metodo: "criarOrdemAgenda", dto: { titulo: "OS" }, user: usuario });
  assert.deepEqual(await service.reprogramarOrdemAgenda("os-1", { titulo: "OS" } as never, usuario), {
    metodo: "reprogramarOrdemAgenda",
    osId: "os-1",
    dto: { titulo: "OS" },
    user: usuario
  });
  assert.deepEqual(await service.listarPlanosRecorrencia(usuario), { metodo: "listarPlanosRecorrencia", user: usuario });
  assert.deepEqual(await service.criarPlanoRecorrencia({ titulo: "Plano" } as never, usuario), { metodo: "criarPlanoRecorrencia", dto: { titulo: "Plano" }, user: usuario });
  assert.deepEqual(await service.atualizarPlanoRecorrencia("plano-1", { titulo: "Plano" } as never, usuario), {
    metodo: "atualizarPlanoRecorrencia",
    planoId: "plano-1",
    dto: { titulo: "Plano" },
    user: usuario
  });
  assert.deepEqual(await service.gerarOrdemPlanoRecorrencia("plano-1", usuario), {
    metodo: "gerarOrdemPlanoRecorrencia",
    planoId: "plano-1",
    user: usuario
  });
});

test("AdminService delega frota para service especializado", async () => {
  const frotaService = {
    listarLocalizacoesFrota: async (user: typeof usuario) => ({ metodo: "listarLocalizacoesFrota", user }),
    listarAbastecimentos: async (user: typeof usuario) => ({ metodo: "listarAbastecimentos", user }),
    criarAbastecimento: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarAbastecimento", dto, user }),
    obterRelatorioFrota: async (user: typeof usuario, referencia?: Date) => ({ metodo: "obterRelatorioFrota", user, referencia })
  } as unknown as AdminFrotaService;
  const service = new AdminService({} as never, undefined, undefined, undefined, frotaService);
  const referencia = new Date("2026-06-18T10:00:00.000Z");

  assert.deepEqual(await service.listarLocalizacoesFrota(usuario), { metodo: "listarLocalizacoesFrota", user: usuario });
  assert.deepEqual(await service.listarAbastecimentos(usuario), { metodo: "listarAbastecimentos", user: usuario });
  assert.deepEqual(await service.criarAbastecimento({ veiculo_id: "veiculo-1" } as never, usuario), {
    metodo: "criarAbastecimento",
    dto: { veiculo_id: "veiculo-1" },
    user: usuario
  });
  assert.deepEqual(await service.obterRelatorioFrota(usuario, referencia), {
    metodo: "obterRelatorioFrota",
    user: usuario,
    referencia
  });
});

test("AdminService delega clientes e equipamentos para services especializados", async () => {
  const clientesService = {
    listarClientes: async (user: typeof usuario) => ({ metodo: "listarClientes", user }),
    criarCliente: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarCliente", dto, user }),
    atualizarCliente: async (clienteId: string, dto: unknown, user: typeof usuario) => ({ metodo: "atualizarCliente", clienteId, dto, user }),
    apagarCliente: async (clienteId: string, user: typeof usuario) => ({ metodo: "apagarCliente", clienteId, user })
  } as unknown as AdminClientesService;
  const equipamentosService = {
    listarEquipamentosCliente: async (clienteId: string, user: typeof usuario) => ({ metodo: "listarEquipamentosCliente", clienteId, user }),
    criarEquipamentoCliente: async (clienteId: string, dto: unknown, user: typeof usuario) => ({ metodo: "criarEquipamentoCliente", clienteId, dto, user }),
    renovarAcessoPublicoEquipamento: async (equipamentoId: string, user: typeof usuario) => ({ metodo: "renovarAcessoPublicoEquipamento", equipamentoId, user }),
    apagarEquipamento: async (equipamentoId: string, user: typeof usuario) => ({ metodo: "apagarEquipamento", equipamentoId, user })
  } as unknown as AdminEquipamentosService;
  const service = new AdminService(
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    clientesService,
    equipamentosService
  );

  assert.deepEqual(await service.listarClientes(usuario), { metodo: "listarClientes", user: usuario });
  assert.deepEqual(await service.criarCliente({ nome: "Cliente" } as never, usuario), {
    metodo: "criarCliente",
    dto: { nome: "Cliente" },
    user: usuario
  });
  assert.deepEqual(await service.atualizarCliente("cliente-1", { nome: "Cliente" } as never, usuario), {
    metodo: "atualizarCliente",
    clienteId: "cliente-1",
    dto: { nome: "Cliente" },
    user: usuario
  });
  assert.deepEqual(await service.apagarCliente("cliente-1", usuario), {
    metodo: "apagarCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.listarEquipamentosCliente("cliente-1", usuario), {
    metodo: "listarEquipamentosCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.criarEquipamentoCliente("cliente-1", { marca: "Marca" } as never, usuario), {
    metodo: "criarEquipamentoCliente",
    clienteId: "cliente-1",
    dto: { marca: "Marca" },
    user: usuario
  });
  assert.deepEqual(await service.renovarAcessoPublicoEquipamento("equipamento-1", usuario), {
    metodo: "renovarAcessoPublicoEquipamento",
    equipamentoId: "equipamento-1",
    user: usuario
  });
  assert.deepEqual(await service.apagarEquipamento("equipamento-1", usuario), {
    metodo: "apagarEquipamento",
    equipamentoId: "equipamento-1",
    user: usuario
  });
});

test("AdminService delega tecnicos, equipes e engenheiros para services especializados", async () => {
  const tecnicosService = {
    listarTecnicos: async (user: typeof usuario) => ({ metodo: "listarTecnicos", user }),
    criarTecnico: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarTecnico", dto, user }),
    atualizarTecnico: async (tecnicoId: string, dto: unknown, user: typeof usuario) => ({ metodo: "atualizarTecnico", tecnicoId, dto, user }),
    apagarTecnico: async (tecnicoId: string, user: typeof usuario) => ({ metodo: "apagarTecnico", tecnicoId, user })
  } as unknown as AdminTecnicosService;
  const equipesService = {
    listarEquipes: async (user: typeof usuario) => ({ metodo: "listarEquipes", user }),
    criarEquipe: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarEquipe", dto, user }),
    atualizarEquipe: async (equipeId: string, dto: unknown, user: typeof usuario) => ({ metodo: "atualizarEquipe", equipeId, dto, user }),
    apagarEquipe: async (equipeId: string, user: typeof usuario) => ({ metodo: "apagarEquipe", equipeId, user })
  } as unknown as AdminEquipesService;
  const engenheirosService = {
    listarEngenheirosResponsaveis: async (user: typeof usuario) => ({ metodo: "listarEngenheirosResponsaveis", user }),
    criarEngenheiroResponsavel: async (dto: unknown, user: typeof usuario) => ({ metodo: "criarEngenheiroResponsavel", dto, user }),
    atualizarEngenheiroResponsavel: async (engenheiroId: string, dto: unknown, user: typeof usuario) => ({ metodo: "atualizarEngenheiroResponsavel", engenheiroId, dto, user }),
    apagarEngenheiroResponsavel: async (engenheiroId: string, user: typeof usuario) => ({ metodo: "apagarEngenheiroResponsavel", engenheiroId, user })
  } as unknown as AdminEngenheirosService;
  const service = new AdminService(
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    tecnicosService,
    equipesService,
    engenheirosService
  );

  assert.deepEqual(await service.listarTecnicos(usuario), { metodo: "listarTecnicos", user: usuario });
  assert.deepEqual(await service.criarTecnico({ nome: "Tecnico" } as never, usuario), {
    metodo: "criarTecnico",
    dto: { nome: "Tecnico" },
    user: usuario
  });
  assert.deepEqual(await service.atualizarTecnico("tecnico-1", { nome: "Tecnico" } as never, usuario), {
    metodo: "atualizarTecnico",
    tecnicoId: "tecnico-1",
    dto: { nome: "Tecnico" },
    user: usuario
  });
  assert.deepEqual(await service.apagarTecnico("tecnico-1", usuario), {
    metodo: "apagarTecnico",
    tecnicoId: "tecnico-1",
    user: usuario
  });
  assert.deepEqual(await service.listarEquipes(usuario), { metodo: "listarEquipes", user: usuario });
  assert.deepEqual(await service.criarEquipe({ nome: "Equipe" } as never, usuario), {
    metodo: "criarEquipe",
    dto: { nome: "Equipe" },
    user: usuario
  });
  assert.deepEqual(await service.atualizarEquipe("equipe-1", { nome: "Equipe" } as never, usuario), {
    metodo: "atualizarEquipe",
    equipeId: "equipe-1",
    dto: { nome: "Equipe" },
    user: usuario
  });
  assert.deepEqual(await service.apagarEquipe("equipe-1", usuario), {
    metodo: "apagarEquipe",
    equipeId: "equipe-1",
    user: usuario
  });
  assert.deepEqual(await service.listarEngenheirosResponsaveis(usuario), {
    metodo: "listarEngenheirosResponsaveis",
    user: usuario
  });
  assert.deepEqual(await service.criarEngenheiroResponsavel({ nome: "Eng" } as never, usuario), {
    metodo: "criarEngenheiroResponsavel",
    dto: { nome: "Eng" },
    user: usuario
  });
  assert.deepEqual(await service.atualizarEngenheiroResponsavel("eng-1", { nome: "Eng" } as never, usuario), {
    metodo: "atualizarEngenheiroResponsavel",
    engenheiroId: "eng-1",
    dto: { nome: "Eng" },
    user: usuario
  });
  assert.deepEqual(await service.apagarEngenheiroResponsavel("eng-1", usuario), {
    metodo: "apagarEngenheiroResponsavel",
    engenheiroId: "eng-1",
    user: usuario
  });
});

test("AdminService delega pre-chamados para service especializado", async () => {
  const preChamadosService = {
    listarPreChamados: async (user: typeof usuario) => ({ metodo: "listarPreChamados", user }),
    aprovarPreChamado: async (osId: string, user: typeof usuario, dto: unknown) => ({
      metodo: "aprovarPreChamado",
      osId,
      user,
      dto
    }),
    rejeitarPreChamado: async (osId: string, user: typeof usuario) => ({
      metodo: "rejeitarPreChamado",
      osId,
      user
    })
  } as unknown as AdminPreChamadosService;
  const service = new AdminService(
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    preChamadosService
  );

  assert.deepEqual(await service.listarPreChamados(usuario), { metodo: "listarPreChamados", user: usuario });
  assert.deepEqual(await service.aprovarPreChamado("os-1", usuario, { equipe_id: "equipe-1" }), {
    metodo: "aprovarPreChamado",
    osId: "os-1",
    user: usuario,
    dto: { equipe_id: "equipe-1" }
  });
  assert.deepEqual(await service.rejeitarPreChamado("os-1", usuario), {
    metodo: "rejeitarPreChamado",
    osId: "os-1",
    user: usuario
  });
});

test("AdminService delega relatorios nao-PMOC para service especializado", async () => {
  const referencia = new Date("2026-06-19T10:00:00.000Z");
  const relatoriosService = {
    listarRelatoriosAvulsos: async (user: typeof usuario) => ({ metodo: "listarRelatoriosAvulsos", user }),
    obterPreviaRelatorioAvulsoCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "obterPreviaRelatorioAvulsoCliente",
      clienteId,
      user
    }),
    gerarPdfRelatorioAvulsoCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "gerarPdfRelatorioAvulsoCliente",
      clienteId,
      user
    }),
    enviarRelatorioAvulsoCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "enviarRelatorioAvulsoCliente",
      clienteId,
      user
    }),
    apagarRelatorioAvulsoCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "apagarRelatorioAvulsoCliente",
      clienteId,
      user
    }),
    obterRelatorios: async (user: typeof usuario, data: Date) => ({ metodo: "obterRelatorios", user, data })
  } as unknown as AdminRelatoriosService;
  const service = new AdminService(
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    relatoriosService
  );

  assert.deepEqual(await service.listarRelatoriosAvulsos(usuario), {
    metodo: "listarRelatoriosAvulsos",
    user: usuario
  });
  assert.deepEqual(await service.obterPreviaRelatorioAvulsoCliente("cliente-1", usuario), {
    metodo: "obterPreviaRelatorioAvulsoCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.gerarPdfRelatorioAvulsoCliente("cliente-1", usuario), {
    metodo: "gerarPdfRelatorioAvulsoCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.enviarRelatorioAvulsoCliente("cliente-1", usuario), {
    metodo: "enviarRelatorioAvulsoCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.apagarRelatorioAvulsoCliente("cliente-1", usuario), {
    metodo: "apagarRelatorioAvulsoCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.obterRelatorios(usuario, referencia), {
    metodo: "obterRelatorios",
    user: usuario,
    data: referencia
  });
});

test("AdminService delega PMOC para services especializados", async () => {
  const pmocService = {
    obterPreviaPmocCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "obterPreviaPmocCliente",
      clienteId,
      user
    }),
    solicitarAssinaturaPmocEngenheiro: async (clienteId: string, user: typeof usuario) => ({
      metodo: "solicitarAssinaturaPmocEngenheiro",
      clienteId,
      user
    })
  } as unknown as AdminPmocService;
  const pmocPdfService = {
    gerarPdfPmocCliente: async (clienteId: string, user: typeof usuario) => ({
      metodo: "gerarPdfPmocCliente",
      clienteId,
      user
    })
  } as unknown as AdminPmocPdfService;
  const service = new AdminService(
    {} as never,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    pmocService,
    pmocPdfService
  );

  assert.deepEqual(await service.obterPreviaPmocCliente("cliente-1", usuario), {
    metodo: "obterPreviaPmocCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.gerarPdfPmocCliente("cliente-1", usuario), {
    metodo: "gerarPdfPmocCliente",
    clienteId: "cliente-1",
    user: usuario
  });
  assert.deepEqual(await service.solicitarAssinaturaPmocEngenheiro("cliente-1", usuario), {
    metodo: "solicitarAssinaturaPmocEngenheiro",
    clienteId: "cliente-1",
    user: usuario
  });
});

test("listarPreChamados filtra exclusivamente por empresa do usuario e status pre_chamado", async () => {
  const chamadas = {
    where: undefined as unknown
  };
  const prisma = {
    ordemServico: {
      findMany: async ({ where }: { where: unknown }) => {
        chamadas.where = where;
        return [
          {
            id: "os-1",
            titulo: "Limpeza",
            problemaRelatado: "Filtro sujo",
            status: OrdemServicoStatus.pre_chamado,
            criadaEm: new Date("2026-06-10T10:00:00.000Z"),
            cliente: {
              nome: "Maria",
              telefone: "43999999999",
              email: "maria@example.com"
            },
            endereco: {
              bairro: "Centro",
              cidade: "Londrina",
              uf: "PR",
              logradouro: "Rua A"
            }
          }
        ];
      }
    }
  };
  const service = criarService(prisma);

  const resposta = await service.listarPreChamados(usuario);

  assert.deepEqual(chamadas.where, {
    empresaId: "empresa-1",
    status: OrdemServicoStatus.pre_chamado
  });
  assert.equal(resposta.total, 1);
  assert.equal(resposta.items[0].id, "os-1");
});
