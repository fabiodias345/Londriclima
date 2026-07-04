import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type Janela = { inicio: number; tentativas: number };

@Injectable()
export class PublicRateLimitService {
  private readonly janelas = new Map<string, Janela>();
  private readonly duracaoMs = 15 * 60 * 1000;
  private readonly limite = 10;

  verificar(chave: string) {
    const agora = Date.now();
    const atual = this.janelas.get(chave);
    if (!atual || agora - atual.inicio >= this.duracaoMs) {
      this.janelas.set(chave, { inicio: agora, tentativas: 1 });
      return;
    }
    if (atual.tentativas >= this.limite) {
      throw new HttpException("Muitas tentativas. Aguarde alguns minutos.", HttpStatus.TOO_MANY_REQUESTS);
    }
    atual.tentativas += 1;
  }
}
