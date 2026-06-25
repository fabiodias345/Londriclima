import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AdminFrotaService } from "./admin-frota.service";
import { AdminRelatorioTecnicoCoreService } from "./admin-relatorio-tecnico-core.service";

@Injectable()
export class AdminRelatoriosService {
  private readonly core: AdminRelatorioTecnicoCoreService;

  constructor(
    prisma: PrismaService,
    private readonly frotaService: AdminFrotaService
  ) {
    this.core = new AdminRelatorioTecnicoCoreService(prisma);
  }

  async obterRelatorios(usuario: AuthenticatedUser, referencia = new Date()) {
    const relatorios = await this.core.obterRelatorios(usuario, referencia);
    return {
      ...relatorios,
      frota: await this.frotaService.obterRelatorioFrota(usuario, referencia)
    };
  }

  async listarRelatoriosAvulsos(usuario: AuthenticatedUser) {
    return this.core.listarRelatoriosAvulsos(usuario);
  }

  async obterPreviaRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.obterPreviaRelatorioAvulsoCliente(clienteId, usuario);
  }

  async gerarPdfRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.gerarPdfRelatorioAvulsoCliente(clienteId, usuario);
  }

  async enviarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.enviarRelatorioAvulsoCliente(clienteId, usuario);
  }

  async apagarRelatorioAvulsoCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.apagarRelatorioAvulsoCliente(clienteId, usuario);
  }
}
