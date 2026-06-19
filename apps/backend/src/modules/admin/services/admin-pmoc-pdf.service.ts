import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { AdminRelatorioTecnicoCoreService } from "./admin-relatorio-tecnico-core.service";

@Injectable()
export class AdminPmocPdfService {
  private readonly core: AdminRelatorioTecnicoCoreService;

  constructor(prisma: PrismaService, config?: ConfigService) {
    this.core = new AdminRelatorioTecnicoCoreService(prisma, config);
  }

  async gerarPdfPmocCliente(clienteId: string, usuario: AuthenticatedUser) {
    return this.core.gerarPdfPmocCliente(clienteId, usuario);
  }
}
