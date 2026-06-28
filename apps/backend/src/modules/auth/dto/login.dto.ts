import { IsNotEmpty, IsString, ValidateIf } from "class-validator";

export class LoginDto {
  @ValidateIf((dto: LoginDto) => !dto.login)
  @IsString()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((dto: LoginDto) => !dto.email)
  @IsString()
  @IsNotEmpty()
  login?: string;

  @IsString()
  @IsNotEmpty()
  senha: string;
}
