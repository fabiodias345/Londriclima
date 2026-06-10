import { IsOptional, IsString } from "class-validator";

export class RegistrarObservacoesDto {
  @IsOptional()
  @IsString()
  observacoes?: string;
}
