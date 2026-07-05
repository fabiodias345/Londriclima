import { IsIn, IsOptional } from "class-validator";

export class GerarConviteTecnicoDto {
  @IsOptional()
  @IsIn(["tecnico", "auxiliar"], { message: "Funcao do convite invalida." })
  role?: "tecnico" | "auxiliar";
}
