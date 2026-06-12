import { IsNotEmpty, IsString } from "class-validator";

export class ConsultarEquipamentoDto {
  @IsString()
  @IsNotEmpty()
  senha: string;
}
