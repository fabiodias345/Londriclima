import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ConsultarEquipamentoDto } from "./dto/consultar-equipamento.dto";
import { CriarPreChamadoDto } from "./dto/criar-pre-chamado.dto";
import { SiteService } from "./site.service";

@Controller("site")
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post("pre-chamados")
  criarPreChamado(@Body() dto: CriarPreChamadoDto) {
    return this.siteService.criarPreChamado(dto);
  }

  @Post("equipamentos/:codigoPublico/acessar")
  consultarEquipamentoPublico(
    @Param("codigoPublico") codigoPublico: string,
    @Body() dto: ConsultarEquipamentoDto
  ) {
    return this.siteService.consultarEquipamentoPublico(codigoPublico, dto);
  }

  @Get("pmoc/assinaturas/:token")
  consultarAssinaturaPmoc(@Param("token") token: string) {
    return this.siteService.consultarAssinaturaPmoc(token);
  }

  @Post("pmoc/assinaturas/:token/confirmar")
  confirmarAssinaturaPmoc(@Param("token") token: string) {
    return this.siteService.confirmarAssinaturaPmoc(token);
  }
}
