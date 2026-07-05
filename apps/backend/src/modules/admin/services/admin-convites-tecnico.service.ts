import { BadRequestException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../database/prisma.service";
import { AuthenticatedUser } from "../../auth/auth-user";
import { gerarCodigoConvite, hashCodigoConvite, normalizarCodigoConvite } from "../../auth/convite-tecnico-codigo";
import { SmtpEmailService } from "../../automacoes/smtp-email.service";
import { EncaminharConviteTecnicoDto } from "../dto/encaminhar-convite-tecnico.dto";
import { GerarConviteTecnicoDto } from "../dto/gerar-convite-tecnico.dto";

const VALIDADE_CONVITE_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminConvitesTecnicoService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailSender?: SmtpEmailService,
    @Optional() private readonly config?: ConfigService
  ) {}

  async gerar(dto: GerarConviteTecnicoDto, usuario: AuthenticatedUser) {
    const codigo = gerarCodigoConvite();
    const expiraEm = new Date(Date.now() + VALIDADE_CONVITE_MS);
    const role = dto.role === "auxiliar" ? "auxiliar" : "tecnico";
    const convite = await this.prisma.conviteTecnico.create({
      data: {
        empresaId: usuario.empresa_id,
        criadoPorId: usuario.id,
        role,
        codigoHash: hashCodigoConvite(codigo),
        codigoSufixo: normalizarCodigoConvite(codigo).slice(-4),
        expiraEm
      },
      select: { id: true, criadoEm: true }
    });
    return {
      id: convite.id,
      codigo,
      role,
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
        role: true,
        usuarioCriado: { select: { nome: true, login: true } }
      }
    });
    return {
      total: convites.length,
      items: convites.map((convite) => ({
        id: convite.id,
        codigo_sufixo: convite.codigoSufixo,
        role: convite.role,
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

  async encaminharEmail(conviteId: string, dto: EncaminharConviteTecnicoDto, usuario: AuthenticatedUser) {
    const convite = await this.prisma.conviteTecnico.findFirst({
      where: { id: conviteId, empresaId: usuario.empresa_id },
      select: { id: true, codigoHash: true, expiraEm: true, canceladoEm: true, usadoEm: true, role: true }
    });
    if (!convite) throw new NotFoundException("Convite nao encontrado.");
    if (convite.canceladoEm || convite.usadoEm || convite.expiraEm <= new Date()) {
      throw new BadRequestException("Somente convite pendente pode ser encaminhado.");
    }
    if (hashCodigoConvite(dto.codigo) !== convite.codigoHash) {
      throw new BadRequestException("Codigo do convite invalido.");
    }
    if (!this.emailSender) {
      throw new ServiceUnavailableException("Envio por email indisponivel.");
    }

    const email = dto.email.trim().toLowerCase();
    try {
      await this.emailSender.enviar({
        from: this.config?.get<string>("SMTP_FROM", "Clima do Brasil <noreply@climadobrasilengenharia.com.br>")
          ?? "Clima do Brasil <noreply@climadobrasilengenharia.com.br>",
        to: email,
        subject: "Convite para acesso Clima do Brasil",
        text: [
          "Voce recebeu um convite para acessar o aplicativo Clima do Brasil.",
          `Funcao liberada: ${convite.role === "auxiliar" ? "Auxiliar" : "Tecnico"}`,
          "",
          `Codigo: ${dto.codigo.trim().toUpperCase()}`,
          `Valido ate: ${convite.expiraEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
          "",
          "Abra o aplicativo, toque em Primeiro cadastro e informe este codigo.",
          "Este convite pode ser usado somente uma vez."
        ].join("\n")
      });
    } catch {
      throw new ServiceUnavailableException("Nao foi possivel enviar o email. O convite continua disponivel para copia.");
    }

    return { id: convite.id, email, enviado: true };
  }
}
