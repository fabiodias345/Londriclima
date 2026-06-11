import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AprovarPreChamadoDto } from "./dto/aprovar-pre-chamado.dto";
import { CriarAbastecimentoDto } from "./dto/criar-abastecimento.dto";
import { SalvarClienteDto } from "./dto/salvar-cliente.dto";
import { AdminService } from "./admin.service";

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
