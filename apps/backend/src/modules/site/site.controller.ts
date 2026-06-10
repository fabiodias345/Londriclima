import { Body, Controller, Post } from "@nestjs/common";
import { CriarPreChamadoDto } from "./dto/criar-pre-chamado.dto";
import { SiteService } from "./site.service";

@Controller("site")
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Post("pre-chamados")
  criarPreChamado(@Body() dto: CriarPreChamadoDto) {
    return this.siteService.criarPreChamado(dto);
  }
}
