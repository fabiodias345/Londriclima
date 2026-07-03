import { Body, Controller, Post, UploadedFiles, UseInterceptors } from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { AuthService } from "./auth.service";
import { FinalizarPrimeiroAcessoDto } from "./dto/finalizar-primeiro-acesso.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { CadastroFuncionarioArquivo } from "./funcionario-storage.service";

const LIMITE_ARQUIVO_CADASTRO = 3 * 1024 * 1024;

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Post("primeiro-acesso")
  @UseInterceptors(FileFieldsInterceptor([
    { name: "foto", maxCount: 1 },
    { name: "assinatura", maxCount: 1 }
  ], { limits: { fileSize: LIMITE_ARQUIVO_CADASTRO } }))
  finalizarPrimeiroAcesso(
    @Body() dto: FinalizarPrimeiroAcessoDto,
    @UploadedFiles() arquivos: { foto?: CadastroFuncionarioArquivo[]; assinatura?: CadastroFuncionarioArquivo[] }
  ) {
    return this.authService.finalizarPrimeiroAcesso(dto, {
      foto: arquivos?.foto?.[0],
      assinatura: arquivos?.assinatura?.[0]
    });
  }
}
