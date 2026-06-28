import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Patch, Post, Res, StreamableFile, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
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
import { AdminService } from "./admin.service";

type HeaderResponse = {
  setHeader(name: string, value: string): void;
};

@Controller("admin")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
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

  @Get("frota/veiculos")
  listarVeiculosFrota(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarVeiculosFrota(usuario);
  }

  @Post("frota/veiculos")
  criarVeiculoFrota(@Body() dto: SalvarVeiculoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarVeiculoFrota(dto, usuario);
  }

  @Patch("frota/veiculos/:veiculoId")
  atualizarVeiculoFrota(
    @Param("veiculoId", new ParseUUIDPipe()) veiculoId: string,
    @Body() dto: SalvarVeiculoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarVeiculoFrota(veiculoId, dto, usuario);
  }

  @Delete("frota/veiculos/:veiculoId")
  apagarVeiculoFrota(
    @Param("veiculoId", new ParseUUIDPipe()) veiculoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarVeiculoFrota(veiculoId, usuario);
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

  @Post("agenda/ordens")
  criarOrdemAgenda(@Body() dto: SalvarOsAgendaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarOrdemAgenda(dto, usuario);
  }

  @Patch("agenda/ordens/:osId")
  reprogramarOrdemAgenda(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @Body() dto: SalvarOsAgendaDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.reprogramarOrdemAgenda(osId, dto, usuario);
  }

  @Delete("agenda/ordens/:osId")
  apagarOrdemAgenda(
    @Param("osId", new ParseUUIDPipe()) osId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarOrdemAgenda(osId, usuario);
  }

  @Get("planos-recorrencia")
  listarPlanosRecorrencia(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarPlanosRecorrencia(usuario);
  }

  @Post("planos-recorrencia")
  criarPlanoRecorrencia(@Body() dto: SalvarPlanoRecorrenciaDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarPlanoRecorrencia(dto, usuario);
  }

  @Patch("planos-recorrencia/:planoId")
  atualizarPlanoRecorrencia(
    @Param("planoId", new ParseUUIDPipe()) planoId: string,
    @Body() dto: SalvarPlanoRecorrenciaDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarPlanoRecorrencia(planoId, dto, usuario);
  }

  @Post("planos-recorrencia/:planoId/gerar-os")
  gerarOrdemPlanoRecorrencia(
    @Param("planoId", new ParseUUIDPipe()) planoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.gerarOrdemPlanoRecorrencia(planoId, usuario);
  }

  @Delete("planos-recorrencia/:planoId")
  apagarPlanoRecorrencia(
    @Param("planoId", new ParseUUIDPipe()) planoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarPlanoRecorrencia(planoId, usuario);
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

  @Delete("relatorios-avulsos/clientes/:clienteId")
  apagarRelatorioAvulsoCliente(
    @Param("clienteId", new ParseUUIDPipe()) clienteId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarRelatorioAvulsoCliente(clienteId, usuario);
  }

  @Get("engenheiros")
  listarEngenheirosResponsaveis(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarEngenheirosResponsaveis(usuario);
  }

  @Get("tecnicos")
  listarTecnicos(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarTecnicos(usuario);
  }

  @Post("tecnicos")
  criarTecnico(@Body() dto: SalvarTecnicoDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarTecnico(dto, usuario);
  }

  @Patch("tecnicos/:tecnicoId")
  atualizarTecnico(
    @Param("tecnicoId", new ParseUUIDPipe()) tecnicoId: string,
    @Body() dto: SalvarTecnicoDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarTecnico(tecnicoId, dto, usuario);
  }

  @Delete("tecnicos/:tecnicoId")
  apagarTecnico(
    @Param("tecnicoId", new ParseUUIDPipe()) tecnicoId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarTecnico(tecnicoId, usuario);
  }

  @Get("equipes")
  listarEquipes(@CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.listarEquipes(usuario);
  }

  @Post("equipes")
  criarEquipe(@Body() dto: SalvarEquipeDto, @CurrentUser() usuario: AuthenticatedUser) {
    return this.adminService.criarEquipe(dto, usuario);
  }

  @Patch("equipes/:equipeId")
  atualizarEquipe(
    @Param("equipeId", new ParseUUIDPipe()) equipeId: string,
    @Body() dto: SalvarEquipeDto,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.atualizarEquipe(equipeId, dto, usuario);
  }

  @Delete("equipes/:equipeId")
  apagarEquipe(
    @Param("equipeId", new ParseUUIDPipe()) equipeId: string,
    @CurrentUser() usuario: AuthenticatedUser
  ) {
    return this.adminService.apagarEquipe(equipeId, usuario);
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
