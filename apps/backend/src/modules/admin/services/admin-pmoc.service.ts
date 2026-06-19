import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AdminRelatorioTecnicoCoreService } from "./admin-relatorio-tecnico-core.service";

@Injectable()
export class AdminPmocService {
  private readonly core: AdminRelatorioTecnicoCoreService;

  constructor(prisma: PrismaService, config?: ConfigService) {
    this.core = new AdminRelatorioTecnicoCoreService(prisma, config);
  }

  async obterPreviaPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.obterPreviaPmocCliente(clienteId, usuario);
  }

  async solicitarAssinaturaPmocEngenheiro(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.solicitarAssinaturaPmocEngenheiro(clienteId, usuario);
  }
}
