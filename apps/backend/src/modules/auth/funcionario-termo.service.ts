import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { criarPdfBuffer, PdfPage } from "../admin/services/admin-pmoc-pdf-writer";

export const TERMO_RESPONSABILIDADE_VERSAO = "2026-07-04";

@Injectable()
export class FuncionarioTermoService {
  gerar(input: { nome: string; cpf: string; aceitoEm: Date; foto: Buffer; assinatura: Buffer }) {
    const page: PdfPage = [];
    this.text(page, "AIRMOVEBR - TERMO DE RESPONSABILIDADE DE USO DO APLICATIVO", 36, 790, 14, true);
    this.text(page, `Versão: ${TERMO_RESPONSABILIDADE_VERSAO}`, 36, 765, 9);
    this.text(page, `Funcionário: ${input.nome}`, 36, 735, 11, true);
    this.text(page, `CPF: ${this.formatarCpf(input.cpf)}`, 36, 715, 10);
    this.text(page, `Aceite: ${this.formatarData(input.aceitoEm)}`, 36, 695, 10);
    this.text(page, "DECLARAÇÃO", 36, 655, 11, true);
    const paragrafos = [
      "Declaro que recebi acesso pessoal ao aplicativo AIRMOVEBR e me responsabilizo pelo uso correto da conta.",
      "Comprometo-me a executar e registrar integralmente os checklists apresentados pelo sistema em cada atendimento.",
      "Comprometo-me a utilizar os equipamentos de proteção individual (EPIs) descritos no sistema e exigidos para cada atividade.",
      "Reconheço que minha identificação, foto e assinatura poderão constar nos relatórios dos serviços executados por mim.",
      "Comprometo-me a não compartilhar senha, acesso ou dados de clientes e a comunicar imediatamente qualquer incidente."
    ];
    let y = 625;
    for (const paragrafo of paragrafos) {
      for (const linha of this.quebrar(paragrafo, 88)) {
        this.text(page, linha, 36, y, 9);
        y -= 13;
      }
      y -= 9;
    }
    this.text(page, "FOTO DO FUNCIONÁRIO", 55, 275, 9, true);
    this.text(page, "ASSINATURA DO FUNCIONÁRIO", 310, 275, 9, true);
    page.imagens = [
      { buffer: input.foto, x: 55, y: 85, width: 150, height: 175 },
      { buffer: input.assinatura, x: 310, y: 130, width: 220, height: 95 }
    ];
    this.text(page, "Documento aceito eletronicamente no primeiro acesso ao aplicativo AIRMOVEBR.", 36, 45, 8);

    const pdf = criarPdfBuffer([page]);
    return { pdf, sha256: createHash("sha256").update(pdf).digest("hex") };
  }

  private text(page: PdfPage, value: string, x: number, y: number, size: number, bold = false) {
    page.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${this.escape(value)}) Tj ET`);
  }

  private escape(value: string) {
    return value.normalize("NFC").replace(/[^\x20-\xFF]/g, "").replace(/([\\()])/g, "\\$1");
  }

  private quebrar(value: string, limite: number) {
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of value.split(/\s+/)) {
      if (`${atual} ${palavra}`.trim().length > limite && atual) {
        linhas.push(atual);
        atual = palavra;
      } else {
        atual = `${atual} ${palavra}`.trim();
      }
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  private formatarCpf(cpf: string) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }

  private formatarData(data: Date) {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(data);
  }
}
