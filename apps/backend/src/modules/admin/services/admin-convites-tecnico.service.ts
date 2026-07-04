import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { gerarCodigoConvite, hashCodigoConvite, normalizarCodigoConvite } from "../../auth/convite-tecnico-codigo";

const VALIDADE_CONVITE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminConvitesTecnicoService {
  constructor(private readonly prisma: PrismaService) {}

  async gerar(usuario: AuthenticatedUser) {
    const codigo = gerarCodigoConvite();
    const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_MS);
    const convite = await this.prisma.conviteTecnico.create({
      data: {
        empresaId: usuario.empresa_id,
        criadoPorId: usuario.id,
        codigoHash: hashCodigoConvite(codigo),
        codigoSufixo: normalizarCodigoConvite(codigo).slice(-4),
        expiraEm
      },
      select: { id: true, criadoEm: true }
    });
    return {
      id: convite.id,
      codigo,
      expira_em: expiraEm.toISOString(),
      criado_em: convite.criadoEm.toISOString()
    };
  }

  async listar(usuario: AuthenticatedUser) {
    const agora = new Date();
    const convites = await this.prisma.conviteTecnico.findMany({
      where: { empresaId: usuario.empresa_id },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        id: true,
        codigoSufixo: true,
        expiraEm: true,
        canceladoEm: true,
        usadoEm: true,
        criadoEm: true,
        usuarioCriado: { select: { nome: true, login: true } }
      }
    });
    return {
      total: convites.length,
      items: convites.map((convite) => ({
        id: convite.id,
        codigo_sufixo: convite.codigoSufixo,
        estado: convite.usadoEm
          ? "utilizado"
          : convite.canceladoEm
            ? "cancelado"
            : convite.expiraEm <= agora
              ? "vencido"
              : "pendente",
        expira_em: convite.expiraEm.toISOString(),
        criado_em: convite.criadoEm.toISOString(),
        usado_em: convite.usadoEm?.toISOString() ?? null,
        tecnico: convite.usuarioCriado
      }))
    };
  }

  async cancelar(conviteId: string, usuario: AuthenticatedUser) {
    const convite = await this.prisma.conviteTecnico.findFirst({
      where: { id: conviteId, empresaId: usuario.empresa_id },
      select: { id: true, expiraEm: true, canceladoEm: true, usadoEm: true }
    });
    if (!convite) throw new NotFoundException("Convite nao encontrado.");
    if (convite.canceladoEm || convite.usadoEm || convite.expiraEm <= new Date()) {
      throw new BadRequestException("Somente convite pendente pode ser cancelado.");
    }
    const canceladoEm = new Date();
    await this.prisma.conviteTecnico.update({ where: { id: convite.id }, data: { canceladoEm } });
    return { id: convite.id, estado: "cancelado", cancelado_em: canceladoEm.toISOString() };
  }
}
