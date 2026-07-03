import {
  CategoriaAtendimento,
  ChecklistTipo,
  EvidenciaTipo,
  OrdemServicoTipoServico
} from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { montarChecklistMobilePorServico } from "../mobile/mobile-checklists";
import { normalizarImagemPdf } from "./ordens-servico-pdf-image.util";

type EquipamentoRelatorio = {
  id: string;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  codigoQr?: string | null;
  localInstalacao?: string | null;
  gasRefrigerante?: string | null;
};

export type RelatorioCamaraFriaInput = {
  osId: string;
  categoriaServico: CategoriaAtendimento;
  checklistTipo: ChecklistTipo;
  clienteNome: string;
  clienteDocumento: string | null;
  clienteEmail: string | null;
  clienteEndereco: string;
  titulo: string;
  tipoServico: OrdemServicoTipoServico;
  agendadaPara: Date | null;
  finalizadoEm: Date;
  assinaturaUrl: string;
  nomeResponsavelAssinatura: string;
  assinaturaTecnicoUrl: string;
  nomeTecnicoAssinatura: string;
  storageRoot: string;
  totalMaquinas: number;
  equipamento: Omit<EquipamentoRelatorio, "id"> | null;
  equipamentos: EquipamentoRelatorio[];
  evidencias: Array<{
    tipo: EvidenciaTipo;
    descricao: string | null;
    storageUrl: string;
    criadoEm: Date;
  }>;
  checklistRespostas: Array<{
    equipamentoId?: string | null;
    codigo: string;
    tipo?: string;
    valor: string;
    observacao: string | null;
  }>;
};

type ImagemPagina = { label: string; buffer: Buffer };
type Pagina = { subtitulo: string; linhas: string[]; imagens?: ImagemPagina[] };

export class OrdensServicoRelatorioCamaraFriaRenderer {
  renderizar(input: RelatorioCamaraFriaInput) {
    const paginas = [
      this.montarPaginaResumo(input),
      ...this.montarPaginasChecklist(input),
      ...this.montarPaginasFotos(input),
      this.montarPaginaAssinaturas(input)
    ];
    return this.criarPdf(paginas);
  }

  private montarPaginaResumo(input: RelatorioCamaraFriaInput): Pagina {
    const equipamentos = input.equipamentos.length
      ? input.equipamentos
      : input.equipamento
        ? [{ id: "equipamento", ...input.equipamento }]
        : [];
    const linhas = [
      "#DADOS DA ORDEM DE SERVIÇO",
      this.campo("OS", input.osId),
      this.campo("Serviço", input.titulo),
      this.campo("Tipo", this.tipoServico(input.tipoServico)),
      this.campo("Período", `${this.dataHora(input.agendadaPara)} a ${this.dataHora(input.finalizadoEm)}`),
      "#DADOS DO CLIENTE",
      this.campo("Cliente", input.clienteNome),
      this.campo("Documento", input.clienteDocumento || "não informado"),
      this.campo("E-mail", input.clienteEmail || "não informado"),
      this.campo("Endereço", input.clienteEndereco),
      "#EQUIPAMENTOS",
      this.campo("Quantidade", String(input.totalMaquinas))
    ];

    equipamentos.slice(0, 8).forEach((equipamento, index) => {
      const identificacao = [equipamento.tipo, equipamento.marca, equipamento.modelo]
        .filter(Boolean)
        .join(" - ") || "Câmara fria";
      const detalhes = [
        equipamento.localInstalacao,
        equipamento.numeroSerie ? `Série ${equipamento.numeroSerie}` : null,
        equipamento.codigoQr ? `QR ${equipamento.codigoQr}` : null,
        equipamento.gasRefrigerante
      ].filter(Boolean).join(" | ");
      linhas.push(this.campo(`Equipamento ${index + 1}`, `${identificacao}${detalhes ? ` | ${detalhes}` : ""}`));
    });

    return { subtitulo: "Dados da O.S., cliente e equipamentos", linhas };
  }

  private montarPaginasChecklist(input: RelatorioCamaraFriaInput): Pagina[] {
    const itens = montarChecklistMobilePorServico(
      input.tipoServico,
      input.checklistTipo,
      input.categoriaServico
    );
    const porCodigo = new Map(itens.map((item) => [item.codigo, item]));
    const equipamentos = new Map(input.equipamentos.map((item, index) => [item.id, index + 1]));
    const linhas = input.checklistRespostas
      .filter((resposta) => resposta.valor.trim() && resposta.tipo !== "foto" && !resposta.valor.startsWith("/storage/"))
      .map((resposta) => {
        const item = porCodigo.get(resposta.codigo);
        const numero = resposta.equipamentoId ? equipamentos.get(resposta.equipamentoId) : null;
        const label = `${numero ? `Equip. ${numero} - ` : ""}${item?.item ?? resposta.codigo}`;
        const unidade = item?.unidade && !resposta.valor.includes(item.unidade) ? ` ${item.unidade}` : "";
        const observacao = resposta.observacao?.trim() ? ` | ${resposta.observacao.trim()}` : "";
        return this.campo(label, `${resposta.valor.trim()}${unidade}${observacao}`);
      });
    const conteudo = linhas.length ? linhas : [this.campo("Checklist", "Sem respostas registradas")];

    return this.paginar(conteudo, 20).map((parte, index, todas) => ({
      subtitulo: todas.length > 1 ? `Checklist executado - página ${index + 1} de ${todas.length}` : "Checklist executado",
      linhas: ["#CHECKLIST DE MANUTENÇÃO", ...parte]
    }));
  }

  private montarPaginasFotos(input: RelatorioCamaraFriaInput): Pagina[] {
    const itens = montarChecklistMobilePorServico(
      input.tipoServico,
      input.checklistTipo,
      input.categoriaServico
    );
    const porCodigo = new Map(itens.map((item) => [item.codigo, item.item]));
    const urls = new Set<string>();
    const fotos: ImagemPagina[] = [];
    const adicionar = (label: string, storageUrl: string) => {
      if (urls.has(storageUrl)) return;
      const buffer = this.carregarArquivo(input.storageRoot, storageUrl);
      if (!buffer) return;
      urls.add(storageUrl);
      fotos.push({ label, buffer });
    };

    input.checklistRespostas
      .filter((resposta) => resposta.tipo === "foto" || resposta.valor.startsWith("/storage/"))
      .forEach((resposta) => adicionar(porCodigo.get(resposta.codigo) ?? resposta.codigo, resposta.valor));
    input.evidencias.forEach((evidencia) => adicionar(
      evidencia.descricao?.trim() || (evidencia.tipo === EvidenciaTipo.antes ? "Foto inicial" : "Foto final"),
      evidencia.storageUrl
    ));

    if (!fotos.length) {
      return [{ subtitulo: "Evidências fotográficas", linhas: ["#FOTOS", this.campo("Fotos", "Nenhuma foto disponível")] }];
    }

    return this.paginar(fotos, 3).map((parte, index, todas) => ({
      subtitulo: todas.length > 1 ? `Evidências fotográficas - página ${index + 1} de ${todas.length}` : "Evidências fotográficas",
      linhas: ["#FOTOS", ...parte.map((foto) => this.campo(foto.label, "Registrada"))],
      imagens: parte
    }));
  }

  private montarPaginaAssinaturas(input: RelatorioCamaraFriaInput): Pagina {
    const assinaturas: ImagemPagina[] = [];
    const tecnico = this.carregarArquivo(input.storageRoot, input.assinaturaTecnicoUrl);
    const responsavel = this.carregarArquivo(input.storageRoot, input.assinaturaUrl);
    if (tecnico) assinaturas.push({ label: "Assinatura do técnico", buffer: tecnico });
    if (responsavel) assinaturas.push({ label: "Assinatura do responsável", buffer: responsavel });
    return {
      subtitulo: "Validação e encerramento",
      linhas: [
        "#ASSINATURAS",
        this.campo("Técnico", input.nomeTecnicoAssinatura),
        this.campo("Responsável", input.nomeResponsavelAssinatura),
        "#DECLARAÇÃO",
        "O serviço e o checklist acima foram executados e conferidos pelas partes identificadas."
      ],
      imagens: assinaturas
    };
  }

  private criarPdf(paginas: Pagina[]) {
    const objetos = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
    ];
    const pageIds: number[] = [];

    paginas.forEach((pagina) => {
      const imagens = (pagina.imagens ?? []).map((imagem) => ({
        ...imagem,
        normalizada: normalizarImagemPdf(imagem.buffer),
        id: 0
      }));
      imagens.forEach((imagem) => {
        imagem.id = objetos.length + 1;
        const valor = imagem.normalizada;
        objetos.push(`<< /Type /XObject /Subtype /Image /Width ${valor.width} /Height ${valor.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${valor.filtro} /Length ${valor.dados.length} >>\nstream\n${valor.dados.toString("latin1")}\nendstream`);
      });
      const xObjects = imagens.map((imagem, index) => `/Im${index + 1} ${imagem.id} 0 R`).join(" ");
      const conteudo = [this.conteudoTexto(pagina), this.conteudoImagens(imagens)].filter(Boolean).join("\n");
      const pageId = objetos.length + 1;
      const contentId = pageId + 1;
      pageIds.push(pageId);
      objetos.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObjects ? `/XObject << ${xObjects} >>` : ""} >> /Contents ${contentId} 0 R >>`,
        `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
      );
    });

    objetos[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
    return this.montarPdf(objetos);
  }

  private conteudoTexto(pagina: Pagina) {
    const comandos = [
      "0.06 0.20 0.30 rg\n42 776 528 44 re f",
      "0.15 0.58 0.72 rg\n42 772 528 4 re f",
      this.texto("RELATÓRIO CÂMARA FRIA", 54, 804, 15, "F2", "1 1 1"),
      this.texto(pagina.subtitulo, 54, 787, 9, "F1", "0.88 0.95 0.98")
    ];
    let y = 744;
    const limite = pagina.imagens?.length ? 260 : 58;

    for (const linha of pagina.linhas) {
      if (y < limite) break;
      if (linha.startsWith("#")) {
        comandos.push("0.92 0.96 0.98 rg", `42 ${y - 17} 528 22 re f`);
        comandos.push(this.texto(linha.slice(1), 54, y - 4, 10, "F2", "0.06 0.20 0.30"));
        y -= 32;
        continue;
      }
      const [label, valor] = linha.split("\t");
      if (valor !== undefined) {
        const labels = this.quebrar(label, 30);
        const valores = this.quebrar(valor, 68);
        const altura = Math.max(24, Math.max(labels.length, valores.length) * 11 + 10);
        comandos.push(`% ${label}  ${valor}`, "0.80 0.86 0.89 RG\n0.6 w", `42 ${y - altura + 6} 528 ${altura} re S`, `224 ${y - altura + 6} m 224 ${y + 6} l S`);
        labels.forEach((parte, index) => comandos.push(
          this.texto(parte, 52, y - 5 - index * 11, 8.5, "F1", "0.12 0.18 0.22")
        ));
        valores.forEach((parte, index) => comandos.push(
          this.texto(parte, 234, y - 5 - index * 11, 8.5, "F1", "0.12 0.18 0.22")
        ));
        y -= altura;
        continue;
      }
      comandos.push(this.texto(this.limitar(linha, 95), 52, y, 9, "F1", "0.12 0.18 0.22"));
      y -= 14;
    }
    comandos.push("0.55 0.60 0.66 rg\n42 34 528 1 re f");
    comandos.push(this.texto("Documento gerado pela plataforma AIRMOVEBR.", 42, 20, 7.5, "F1", "0.38 0.42 0.48"));
    return comandos.join("\n");
  }

  private conteudoImagens(imagens: Array<{ normalizada: { width: number; height: number } }>) {
    return imagens.map((imagem, index) => {
      const boxWidth = 160;
      const boxHeight = 120;
      const escala = Math.min(boxWidth / imagem.normalizada.width, boxHeight / imagem.normalizada.height);
      const width = imagem.normalizada.width * escala;
      const height = imagem.normalizada.height * escala;
      const x = 42 + index * 176 + (boxWidth - width) / 2;
      const y = 80 + (boxHeight - height) / 2;
      return `q\n0.78 0.84 0.88 RG\n1 w\n${42 + index * 176} 80 ${boxWidth} ${boxHeight} re S\n${width} 0 0 ${height} ${x} ${y} cm\n/Im${index + 1} Do\nQ`;
    }).join("\n");
  }

  private carregarArquivo(storageRoot: string, storageUrl: string) {
    if (!storageUrl.startsWith("/storage/")) return null;
    const partes = storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean);
    const caminho = resolve(storageRoot, join(...partes));
    try {
      return readFileSync(caminho);
    } catch {
      return null;
    }
  }

  private montarPdf(objetos: string[]) {
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objetos.forEach((objeto, index) => {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${index + 1} 0 obj\n${objeto}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
  }

  private texto(valor: string, x: number, y: number, tamanho: number, fonte: "F1" | "F2", cor: string) {
    return `BT\n${cor} rg\n/${fonte} ${tamanho} Tf\n${x} ${y} Td\n(${this.escapar(valor)}) Tj\nET`;
  }

  private campo(label: string, valor: string) {
    return `${label}\t${valor || "não informado"}`;
  }

  private paginar<T>(itens: T[], tamanho: number) {
    const paginas: T[][] = [];
    for (let index = 0; index < itens.length; index += tamanho) paginas.push(itens.slice(index, index + tamanho));
    return paginas;
  }

  private dataHora(data: Date | null) {
    if (!data) return "não informado";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      dateStyle: "short",
      timeStyle: "short"
    }).format(data);
  }

  private tipoServico(tipo: OrdemServicoTipoServico) {
    if (tipo === OrdemServicoTipoServico.corretiva) return "Corretiva";
    if (tipo === OrdemServicoTipoServico.instalacao) return "Instalação";
    return "Preventiva";
  }

  private limitar(valor: string, limite: number) {
    return valor.length <= limite ? valor : `${valor.slice(0, limite - 3)}...`;
  }

  private quebrar(valor: string, limite: number) {
    const palavras = valor.split(/\s+/);
    const linhas: string[] = [];
    for (const palavra of palavras) {
      const atual = linhas.at(-1);
      if (!atual || atual.length + palavra.length + 1 > limite) linhas.push(palavra);
      else linhas[linhas.length - 1] = `${atual} ${palavra}`;
    }
    return linhas.length ? linhas : [""];
  }

  private escapar(valor: string) {
    return valor.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }
}
