import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class EncaminharConviteTecnicoDto {
  @IsEmail({}, { message: "Email invalido." })
  email!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;
}
