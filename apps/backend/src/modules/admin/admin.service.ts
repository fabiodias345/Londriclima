import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  OrdemServicoStatus,
  Prisma,
  UsuarioRole
} from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { AuthenticatedUser } from "../auth/auth-user";
import { AprovarPreChamadoDto } from "./dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";
import { SalvarEquipamentoDto } from "./dto/salvar-equipamento.dto";
import { SalvarClienteDto } from "./dto/salvar-cliente.dto";
import { SalvarEmpresaDto } from "./dto/salvar-empresa.dto";
import { SalvarEngenheiroResponsavelDto } from "./dto/salvar-engenheiro-responsavel.dto";
import { SalvarEquipeDto } from "./dto/salvar-equipe.dto";
import { SalvarOsAgendaDto } from "./dto/salvar-os-agenda.dto";
import { SalvarPlanoRecorrenciaDto } from "./dto/salvar-plano-recorrencia.dto";
import { SalvarTecnicoDto } from "./dto/salvar-tecnico.dto";
import { SalvarVeiculoDto } from "./dto/salvar-veiculo.dto";
import { AdminAgendaService } from "./services/admin-agenda.service";
import { AdminClientesService } from "./services/admin-clientes.service";
import { AdminEquipamentosService } from "./services/admin-equipamentos.service";
import { AdminEngenheirosService } from "./services/admin-engenheiros.service";
import { AdminEquipesService } from "./services/admin-equipes.service";
import { AdminFrotaService } from "./services/admin-frota.service";
import { AdminPmocPdfService } from "./services/admin-pmoc-pdf.service";
import { AdminPmocService } from "./services/admin-pmoc.service";
import { AdminPreChamadosService } from "./services/admin-pre-chamados.service";
import { AdminRecorrenciaService } from "./services/admin-recorrencia.service";
import { AdminRelatoriosService } from "./services/admin-relatorios.service";
import { AdminTecnicosService } from "./services/admin-tecnicos.service";

@Injectable()
export class AdminService {
  private readonly agendaService: AdminAgendaService;
  private readonly recorrenciaService: AdminRecorrenciaService;
  private readonly frotaService: AdminFrotaService;
  private readonly clientesService: AdminClientesService;
  private readonly equipamentosService: AdminEquipamentosService;
  private readonly tecnicosService: AdminTecnicosService;
  private readonly equipesService: AdminEquipesService;
  private readonly engenheirosService: AdminEngenheirosService;
  private readonly preChamadosService: AdminPreChamadosService;
  private readonly relatoriosService: AdminRelatoriosService;
  private readonly pmocService: AdminPmocService;
  private readonly pmocPdfService: AdminPmocPdfService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
    agendaService?: AdminAgendaService,
    recorrenciaService?: AdminRecorrenciaService,
    frotaService?: AdminFrotaService,
    clientesService?: AdminClientesService,
    equipamentosService?: AdminEquipamentosService,
    tecnicosService?: AdminTecnicosService,
    equipesService?: AdminEquipesService,
    engenheirosService?: AdminEngenheirosService,
    preChamadosService?: AdminPreChamadosService,
    relatoriosService?: AdminRelatoriosService,
    pmocService?: AdminPmocService,
    pmocPdfService?: AdminPmocPdfService
  ) {
    this.agendaService = agendaService ?? new AdminAgendaService(prisma);
    this.recorrenciaService = recorrenciaService ?? new AdminRecorrenciaService(prisma);
    this.frotaService = frotaService ?? new AdminFrotaService(prisma);
    this.clientesService = clientesService ?? new AdminClientesService(prisma);
    this.equipamentosService = equipamentosService ?? new AdminEquipamentosService(prisma);
    this.tecnicosService = tecnicosService ?? new AdminTecnicosService(prisma);
    this.equipesService = equipesService ?? new AdminEquipesService(prisma);
    this.engenheirosService = engenheirosService ?? new AdminEngenheirosService(prisma);
    this.preChamadosService = preChamadosService ?? new AdminPreChamadosService(prisma);
    this.relatoriosService = relatoriosService ?? new AdminRelatoriosService(prisma, this.frotaService);
    this.pmocService = pmocService ?? new AdminPmocService(prisma, config);
    this.pmocPdfService = pmocPdfService ?? new AdminPmocPdfService(prisma, config);
  }

  async listarPreChamados(usuario: AuthenticatedUser) {
    return this.preChamadosService.listarPreChamados(usuario);
  }

  async listarOpcoesDespacho(usuario: AuthenticatedUser) {
    const [equipes, tecnicos] = await Promise.all([
      this.prisma.equipe.findMany({
        where: {
          empresaId: usuario.empresa_id,
          ativa: true
        },
        orderBy: {
          nome: "asc"
        },
        select: {
          id: true,
          nome: true,
          membros: {
            where: {
              ativo: true
            },
            select: {
              funcao: true,
              usuario: {
                select: {
                  id: true,
                  nome: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          tecnico: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      }),
      this.prisma.usuario.findMany({
        where: {
          empresaId: usuario.empresa_id,
          ativo: true,
          role: {
            in: [UsuarioRole.admin, UsuarioRole.supervisor, UsuarioRole.tecnico, UsuarioRole.auxiliar]
          }
        },
        orderBy: {
          nome: "asc"
        },
        select: {
          id: true,
          nome: true,
          role: true
        }
      })
    ]);

    return {
      equipes: equipes.map((equipe) => ({
        id: equipe.id,
        nome: equipe.nome,
        tecnico: equipe.tecnico,
        membros: equipe.membros.map((membro) => ({
          funcao: membro.funcao,
          usuario: membro.usuario
        }))
      })),
      tecnicos
    };
  }

  async listarLocalizacoesFrota(usuario: AuthenticatedUser) {
    return this.frotaService.listarLocalizacoesFrota(usuario);
  }

  async listarVeiculosFrota(usuario: AuthenticatedUser) {
    return this.frotaService.listarVeiculos(usuario);
  }

  async criarVeiculoFrota(dto: SalvarVeiculoDto, usuario: AuthenticatedUser) {
    return this.frotaService.criarVeiculo(dto, usuario);
  }

  async atualizarVeiculoFrota(veiculoId: string, dto: SalvarVeiculoDto, usuario: AuthenticatedUser) {
    return this.frotaService.atualizarVeiculo(veiculoId, dto, usuario);
  }

  async apagarVeiculoFrota(veiculoId: string, usuario: AuthenticatedUser) {
    return this.frotaService.apagarVeiculo(veiculoId, usuario);
  }

  async listarAbastecimentos(usuario: AuthenticatedUser) {
    return this.frotaService.listarAbastecimentos(usuario);
  }

  async criarAbastecimento(dto: CriarAbastecimentoDto, usuario: AuthenticatedUser) {
    return this.frotaService.criarAbastecimento(dto, usuario);
  }

  async obterRelatorioFrota(usuario: AuthenticatedUser, referencia = new Date()) {
    return this.frotaService.obterRelatorioFrota(usuario, referencia);
  }

  async listarAgenda(usuario: AuthenticatedUser) {
    return this.agendaService.listarAgenda(usuario);
  }

  async criarOrdemAgenda(dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    return this.agendaService.criarOrdemAgenda(dto, usuario);
  }

  async reprogramarOrdemAgenda(osId: string, dto: SalvarOsAgendaDto, usuario: AuthenticatedUser) {
    return this.agendaService.reprogramarOrdemAgenda(osId, dto, usuario);
  }

  async apagarOrdemAgenda(osId: string, usuario: AuthenticatedUser) {
    return this.agendaService.apagarOrdemAgenda(osId, usuario);
  }

  async listarPlanosRecorrencia(usuario: AuthenticatedUser) {
    return this.recorrenciaService.listarPlanosRecorrencia(usuario);
  }

  async criarPlanoRecorrencia(dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    return this.recorrenciaService.criarPlanoRecorrencia(dto, usuario);
  }

  async atualizarPlanoRecorrencia(planoId: string, dto: SalvarPlanoRecorrenciaDto, usuario: AuthenticatedUser) {
    return this.recorrenciaService.atualizarPlanoRecorrencia(planoId, dto, usuario);
  }

  async gerarOrdemPlanoRecorrencia(planoId: string, usuario: AuthenticatedUser) {
    return this.recorrenciaService.gerarOrdemPlanoRecorrencia(planoId, usuario);
  }

  async listarClientes(usuario: AuthenticatedUser) {
    return this.clientesService.listarClientes(usuario);
  }

  async obterEmpresa(usuario: AuthenticatedUser) {
    const empresa = await this.prisma.empresa.findUnique({
      where: {
        id: usuario.empresa_id
      },
      select: this.empresaSelect()
    });

    if (!empresa) {
      throw new NotFoundException("Empresa nao encontrada.");
    }

    return this.mapearEmpresa(empresa);
  }

  async atualizarEmpresa(dto: SalvarEmpresaDto, usuario: AuthenticatedUser) {
    const nomeFantasia = this.stringOuNulo(dto.nome_fantasia);
    const razaoSocial = this.stringOuNulo(dto.razao_social);
    const nome = nomeFantasia ?? razaoSocial;

    if (!nome) {
      throw new BadRequestException("Informe razao social ou nome fantasia.");
    }

    const empresa = await this.prisma.empresa.update({
      where: {
        id: usuario.empresa_id
      },
      data: {
        nome,
        razaoSocial,
        nomeFantasia,
        cnpj: this.digitosOuNulo(dto.cnpj),
        email: this.emailOuNulo(dto.email),
        telefone: this.digitosOuNulo(dto.telefone),
        logradouro: this.stringOuNulo(dto.logradouro),
        numero: this.stringOuNulo(dto.numero),
        complemento: this.stringOuNulo(dto.complemento),
        bairro: this.stringOuNulo(dto.bairro),
        cidade: this.stringOuNulo(dto.cidade),
        uf: this.stringOuNulo(dto.uf)?.toUpperCase() ?? null,
        cep: this.digitosOuNulo(dto.cep),
        inscricaoEstadual: this.stringOuNulo(dto.inscricao_estadual),
        inscricaoMunicipal: this.stringOuNulo(dto.inscricao_municipal),
        responsavelLegal: this.stringOuNulo(dto.responsavel_legal),
        responsavelCpf: this.digitosOuNulo(dto.responsavel_cpf),
        contatoPrincipal: this.stringOuNulo(dto.contato_principal),
        contatoCargo: this.stringOuNulo(dto.contato_cargo),
        status: dto.status ?? "ativa",
        observacoes: this.stringOuNulo(dto.observacoes),
        ativa: (dto.status ?? "ativa") === "ativa"
      },
      select: this.empresaSelect()
    });

    return this.mapearEmpresa(empresa);
  }

  async listarEngenheirosResponsaveis(usuario: AuthenticatedUser) {
    return this.engenheirosService.listarEngenheirosResponsaveis(usuario);
  }

  async listarTecnicos(usuario: AuthenticatedUser) {
    return this.tecnicosService.listarTecnicos(usuario);
  }

  async criarTecnico(dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    return this.tecnicosService.criarTecnico(dto, usuario);
  }

  async atualizarTecnico(tecnicoId: string, dto: SalvarTecnicoDto, usuario: AuthenticatedUser) {
    return this.tecnicosService.atualizarTecnico(tecnicoId, dto, usuario);
  }

  async apagarTecnico(tecnicoId: string, usuario: AuthenticatedUser) {
    return this.tecnicosService.apagarTecnico(tecnicoId, usuario);
  }

  async listarEquipes(usuario: AuthenticatedUser) {
    return this.equipesService.listarEquipes(usuario);
  }

  async criarEquipe(dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    return this.equipesService.criarEquipe(dto, usuario);
  }

  async atualizarEquipe(equipeId: string, dto: SalvarEquipeDto, usuario: AuthenticatedUser) {
    return this.equipesService.atualizarEquipe(equipeId, dto, usuario);
  }

  async apagarEquipe(equipeId: string, usuario: AuthenticatedUser) {
    return this.equipesService.apagarEquipe(equipeId, usuario);
  }

  async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.pmocService.obterPreviaPmocCliente(clienteId, usuario);
  }

  async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.pmocPdfService.gerarPdfPmocCliente(clienteId, usuario);
  }

  async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {
    return this.pmocService.solicitarAssinaturaPmocEngenheiro(clienteId, usuario);
  }

  async listarRelatoriosAvulsos(usuario: AuthenticatedUser) {
    return this.relatoriosService.listarRelatoriosAvulsos(usuario);
  }

  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.relatoriosService.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
  }

  async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.relatoriosService.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
  }

  async enviarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.relatoriosService.enviarRelatorioAvulsoCliente(clienteId, usuario);
  }

  async apagarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.relatoriosService.apagarRelatorioAvulsoCliente(clienteId, usuario);
  }

  async criarEngenheiroResponsavel(dto: SalvarEngenheiroResponsavelDto, usuario: AuthenticatedUser) {
    return this.engenheirosService.criarEngenheiroResponsavel(dto, usuario);
  }

  async atualizarEngenheiroResponsavel(
    engenheiroId: string,
    dto: SalvarEngenheiroResponsavelDto,
    usuario: AuthenticatedUser
  ) {
    return this.engenheirosService.atualizarEngenheiroResponsavel(engenheiroId, dto, usuario);
  }

  async apagarEngenheiroResponsavel(engenheiroId: string, usuario: AuthenticatedUser) {
    return this.engenheirosService.apagarEngenheiroResponsavel(engenheiroId, usuario);
  }

  async criarCliente(dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    return this.clientesService.criarCliente(dto, usuario);
  }

  async atualizarCliente(clienteId: string, dto: SalvarClienteDto, usuario: AuthenticatedUser) {
    return this.clientesService.atualizarCliente(clienteId, dto, usuario);
  }

  async apagarCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.clientesService.apagarCliente(clienteId, usuario);
  }

  async listarEquipamentosCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.listarEquipamentosCliente(clienteId, usuario);
  }

  async criarEquipamentoCliente(
    clienteId: string,
    dto: SalvarEquipamentoDto,
    usuario: AuthenticatedUser
  ) {
    return this.equipamentosService.criarEquipamentoCliente(clienteId, dto, usuario);
  }

  async renovarAcessoPublicoEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.renovarAcessoPublicoEquipamento(equipamentoId, usuario);
  }

  async apagarEquipamento(equipamentoId: string, usuario: AuthenticatedUser) {
    return this.equipamentosService.apagarEquipamento(equipamentoId, usuario);
  }

  async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {
    return this.relatoriosService.obterRelatorios(usuario, referencia);
  }

  async aprovarPreChamado(osId: string, usuario: AuthenticatedUser, dto: AprovarPreChamadoDto = {}) {
    return this.preChamadosService.aprovarPreChamado(osId, usuario, dto);
  }

  async rejeitarPreChamado(osId: string, usuario: AuthenticatedUser) {
    return this.preChamadosService.rejeitarPreChamado(osId, usuario);
  }

  private mapearAtualizacaoOrdem(ordem: { id: string; status: OrdemServicoStatus; atualizadaEm: Date }) {
    return {
      os_id: ordem.id,
      status: ordem.status,
      atualizado_em: ordem.atualizadaEm.toISOString()
    };
  }

  private mapearEngenheiroResponsavel(engenheiro: {
    id: string;
    nome: string;
    cpf: string;
    crea: string;
    email: string;
    telefone: string | null;
    atualizadoEm: Date;
  }) {
    return {
      id: engenheiro.id,
      nome: engenheiro.nome,
      cpf: engenheiro.cpf,
      crea: engenheiro.crea,
      email: engenheiro.email,
      telefone: engenheiro.telefone,
      atualizado_em: engenheiro.atualizadoEm.toISOString()
    };
  }

  private empresaSelect() {
    return {
      id: true,
      nome: true,
      razaoSocial: true,
      nomeFantasia: true,
      cnpj: true,
      email: true,
      telefone: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      uf: true,
      cep: true,
      inscricaoEstadual: true,
      inscricaoMunicipal: true,
      responsavelLegal: true,
      responsavelCpf: true,
      contatoPrincipal: true,
      contatoCargo: true,
      status: true,
      observacoes: true,
      ativa: true,
      criadoEm: true,
      atualizadoEm: true
    } satisfies Prisma.EmpresaSelect;
  }

  private mapearEmpresa(empresa: {
    id: string;
    nome: string;
    razaoSocial: string | null;
    nomeFantasia: string | null;
    cnpj: string | null;
    email: string | null;
    telefone: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    cep: string | null;
    inscricaoEstadual: string | null;
    inscricaoMunicipal: string | null;
    responsavelLegal: string | null;
    responsavelCpf: string | null;
    contatoPrincipal: string | null;
    contatoCargo: string | null;
    status: string;
    observacoes: string | null;
    ativa: boolean;
    criadoEm: Date;
    atualizadoEm: Date;
  }) {
    return {
      id: empresa.id,
      nome: empresa.nome,
      razao_social: empresa.razaoSocial,
      nome_fantasia: empresa.nomeFantasia,
      cnpj: this.formatarCnpj(empresa.cnpj),
      email: empresa.email,
      telefone: empresa.telefone,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.uf,
      cep: empresa.cep,
      inscricao_estadual: empresa.inscricaoEstadual,
      inscricao_municipal: empresa.inscricaoMunicipal,
      responsavel_legal: empresa.responsavelLegal,
      responsavel_cpf: this.formatarCpf(empresa.responsavelCpf),
      contato_principal: empresa.contatoPrincipal,
      contato_cargo: empresa.contatoCargo,
      status: empresa.status,
      ativa: empresa.ativa,
      observacoes: empresa.observacoes,
      criado_em: empresa.criadoEm.toISOString(),
      atualizado_em: empresa.atualizadoEm.toISOString()
    };
  }

  private stringOuNulo(valor?: string) {
    const texto = valor?.trim();
    return texto ? texto : null;
  }

  private emailOuNulo(valor?: string) {
    const texto = valor?.trim().toLowerCase();
    return texto ? texto : null;
  }

  private digitosOuNulo(valor?: string) {
    const digitos = valor?.replace(/\D/g, "");
    return digitos ? digitos : null;
  }

  private formatarCnpj(valor: string | null) {
    if (!valor || valor.length !== 14) {
      return valor;
    }

    return `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}/${valor.slice(8, 12)}-${valor.slice(12)}`;
  }

  private formatarCpf(valor: string | null) {
    if (!valor || valor.length !== 11) {
      return valor;
    }

    return `${valor.slice(0, 3)}.${valor.slice(3, 6)}.${valor.slice(6, 9)}-${valor.slice(9)}`;
  }



}
