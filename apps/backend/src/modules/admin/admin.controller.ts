import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AprovarPreChamadoDto } from "./dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";
import { SalvarEquipamentoDto } from "./dto/salvar-equipamento.dto";
import { SalvarClienteDto } from "./dto/salvar-cliente.dto";
import { SalvarEmpresaDto } from "./dto/salvar-empresa.dto";
import { SalvarEngenheiroResponsavelDto } from "./dto/salvar-engenheiro-responsavel.dto";
import { AdminService } from "./admin.service";

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("pre-chamados")
  listarPreChamados(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarPreChamados(usuario);
  }

  @Get("opcoes-despacho")
  listarOpcoesDespacho(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarOpcoesDespacho(usuario);
  }

  @Get("frota/localizacoes")
  listarLocalizacoesFrota(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarLocalizacoesFrota(usuario);
  }

  @Get("frota/abastecimentos")
  listarAbastecimentos(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarAbastecimentos(usuario);
  }

  @Post("frota/abastecimentos")
  criarAbastecimento(
    @Body() dto: CriarAbastecimentoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.criarAbastecimento(dto, usuario);
  }

  @Get("relatorios/frota")
  obterRelatorioFrota(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.obterRelatorioFrota(usuario);
  }

  @Get("agenda")
  listarAgenda(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarAgenda(usuario);
  }

  @Get("clientes")
  listarClientes(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarClientes(usuario);
  }

  @Get("empresa")
  obterEmpresa(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.obterEmpresa(usuario);
  }

  @Patch("empresa")
  atualizarEmpresa(@Body() dto: SalvarEmpresaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.atualizarEmpresa(dto, usuario);
  }

  @Get("pmoc/clientes/:clienteId/previa")
  obterPreviaPmocCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.obterPreviaPmocCliente(clienteId, usuario);
  }

  @Get("pmoc/clientes/:clienteId/pdf")
  @Header("Content-Type", "application/pdf")
  async gerarPdfPmocCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse
  ) {
    const pdf = await this.adminService.gerarPdfPmocCliente(clienteId, usuario);
    response.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    return new StreamableFile(pdf.buffer);
  }

  @Post("pmoc/clientes/:clienteId/assinatura-engenheiro")
  solicitarAssinaturaPmocEngenheiro(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.solicitarAssinaturaPmocEngenheiro(clienteId, usuario);
  }

  @Get("relatorios-avulsos")
  listarRelatoriosAvulsos(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarRelatoriosAvulsos(usuario);
  }

  @Get("relatorios-avulsos/clientes/:clienteId/previa")
  obterPreviaRelatorioAvulsoCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
  }

  @Get("relatorios-avulsos/clientes/:clienteId/pdf")
  @Header("Content-Type", "application/pdf")
  async gerarPdfRelatorioAvulsoCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser,
    @Res({ passthrough: true }) response: HeaderResponse
  ) {
    const pdf = await this.adminService.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
    response.setHeader("Content-Disposition", `attachment; filename="${pdf.filename}"`);
    return new StreamableFile(pdf.buffer);
  }

  @Post("relatorios-avulsos/clientes/:clienteId/enviar")
  enviarRelatorioAvulsoCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.enviarRelatorioAvulsoCliente(clienteId, usuario);
  }

  @Get("engenheiros")
  listarEngenheirosResponsaveis(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarEngenheirosResponsaveis(usuario);
  }

  @Post("engenheiros")
  criarEngenheiroResponsavel(
    @Body() dto: SalvarEngenheiroResponsavelDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.criarEngenheiroResponsavel(dto, usuario);
  }

  @Patch("engenheiros/:engenheiroId")
  atualizarEngenheiroResponsavel(
    @Param("engenheiroId", new ParseUUIDPipe()) engenheiroId: string,
    @Body() dto: SalvarEngenheiroResponsavelDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarEngenheiroResponsavel(engenheiroId, dto, usuario);
  }

  @Delete("engenheiros/:engenheiroId")
  apagarEngenheiroResponsavel(
    @Param("engenheiroId", new ParseUUIDPipe()) engenheiroId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarEngenheiroResponsavel(engenheiroId, usuario);
  }

  @Post("clientes")
  criarCliente(@Body() dto: SalvarClienteDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarCliente(dto, usuario);
  }

  @Patch("clientes/:clienteId")
  atualizarCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @Body() dto: SalvarClienteDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarCliente(clienteId, dto, usuario);
  }

  @Delete("clientes/:clienteId")
  apagarCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarCliente(clienteId, usuario);
  }

  @Get("clientes/:clienteId/equipamentos")
  listarEquipamentosCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.listarEquipamentosCliente(clienteId, usuario);
  }

  @Post("clientes/:clienteId/equipamentos")
  criarEquipamentoCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @Body() dto: SalvarEquipamentoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.criarEquipamentoCliente(clienteId, dto, usuario);
  }

  @Post("equipamentos/:equipamentoId/renovar-acesso")
  renovarAcessoPublicoEquipamento(
    @Param("equipamentoId", new ParseUUIDPipe()) equipamentoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.renovarAcessoPublicoEquipamento(equipamentoId, usuario);
  }

  @Delete("equipamentos/:equipamentoId")
  apagarEquipamento(
    @Param("equipamentoId", new ParseUUIDPipe()) equipamentoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarEquipamento(equipamentoId, usuario);
  }

  @Get("relatorios")
  obterRelatorios(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.obterRelatorios(usuario);
  }

  @Patch("pre-chamados/:osId/aprovar")
  aprovarPreChamado(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: AprovarPreChamadoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.aprovarPreChamado(osId, usuario, dto);
  }

  @Patch("pre-chamados/:osId/rejeitar")
  rejeitarPreChamado(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.rejeitarPreChamado(osId, usuario);
  }
}
