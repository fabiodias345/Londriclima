import { IsNotEmpty, IsString, Matches } from "class-validator";

export class ValidarConviteTecnicoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z0-9-]{8,12}$/)
  codigo: string;
}
