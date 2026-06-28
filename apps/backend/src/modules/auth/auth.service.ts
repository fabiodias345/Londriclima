import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { PasswordHashService } from "./password-hash.service";
import { TokenPayload, TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHashService: PasswordHashService,
    private readonly tokenService: TokenService
  ) {}

  async login(dto: LoginDto) {
    const identificador = (dto.login?.trim() || dto.email?.trim() || "").toLowerCase();
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        OR: [{ login: identificador }, { email: identificador }],
        ativo: true,
        empresa: {
          ativa: true
        }
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        login: true,
        email: true,
        senhaHash: true,
        role: true
      }
    });

    if (!usuario) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const senhaValida = await this.passwordHashService.verify(dto.senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    await this.prisma.usuario.update({
      where: {
        id: usuario.id
      },
      data: {
        ultimoLoginEm: new Date()
      }
    });

    return this.criarRespostaAutenticacao({
      sub: usuario.id,
      empresa_id: usuario.empresaId,
      email: usuario.email,
      role: usuario.role
    }, {
      id: usuario.id,
      empresa_id: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role
    });
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = this.tokenService.verify(dto.refresh_token, "refresh");
    const usuario = await this.prisma.usuario.findFirst({
      where: {
        id: payload.sub,
        ativo: true,
        empresa: {
          ativa: true
        }
      },
      select: {
        id: true,
        empresaId: true,
        nome: true,
        email: true,
        role: true
      }
    });

    if (!usuario) {
      throw new UnauthorizedException("Refresh token inválido.");
    }

    return this.criarRespostaAutenticacao({
      sub: usuario.id,
      empresa_id: usuario.empresaId,
      email: usuario.email,
      role: usuario.role
    }, {
      id: usuario.id,
      empresa_id: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role
    });
  }

  private criarRespostaAutenticacao(payload: TokenPayload, usuario: {
    id: string;
    empresa_id: string;
    nome: string;
    email: string;
    role: string;
  }) {
    const accessToken = this.tokenService.sign(payload, "access");
    const refreshToken = this.tokenService.sign(payload, "refresh");

    return {
      access_token: accessToken.token,
      refresh_token: refreshToken.token,
      token_type: "Bearer",
      expires_in: accessToken.expiresIn,
      usuario
    };
  }
}
