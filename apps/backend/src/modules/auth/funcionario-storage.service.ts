import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";

export type CadastroFuncionarioArquivo = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class FuncionarioStorageService {
  constructor(private readonly config: ConfigService) {}

  async salvarCadastro(input: {
    empresaId: string;
    usuarioId: string;
    foto?: CadastroFuncionarioArquivo;
    assinatura?: CadastroFuncionarioArquivo;
  }) {
    const foto = this.validarFoto(input.foto);
    const assinatura = this.validarAssinatura(input.assinatura);
    const relativeDir = join("funcionarios", input.empresaId, input.usuarioId, "perfil");
    const storageRoot = this.resolveStorageRoot();
    const fotoPath = join(relativeDir, `foto.${foto.extensao}`);
    const assinaturaPath = join(relativeDir, "assinatura.png");

    await mkdir(join(storageRoot, relativeDir), { recursive: true });
    await Promise.all([
      writeFile(join(storageRoot, fotoPath), foto.arquivo.buffer),
      writeFile(join(storageRoot, assinaturaPath), assinatura.buffer)
    ]);

    return {
      fotoStorageUrl: this.storageUrl(fotoPath),
      assinaturaStorageUrl: this.storageUrl(assinaturaPath)
    };
  }

  async salvarDocumentoPdf(input: { empresaId: string; usuarioId: string; nomeArquivo: string; pdf: Buffer }) {
    const nomeSeguro = input.nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, "_");
    const relativeDir = join("funcionarios", input.empresaId, input.usuarioId, "documentos");
    const relativePath = join(relativeDir, nomeSeguro);
    const storageRoot = this.resolveStorageRoot();
    await mkdir(join(storageRoot, relativeDir), { recursive: true });
    await writeFile(join(storageRoot, relativePath), input.pdf);
    return this.storageUrl(relativePath);
  }

  async carregarDocumento(storageUrl: string) {
    if (!storageUrl.startsWith("/storage/")) throw new BadRequestException("Documento invalido.");
    const storageRoot = this.resolveStorageRoot();
    const caminho = resolve(storageRoot, ...storageUrl.replace(/^\/storage\//, "").split("/").filter(Boolean));
    if (caminho !== storageRoot && !caminho.startsWith(`${storageRoot}${sep}`)) {
      throw new BadRequestException("Documento invalido.");
    }
    return readFile(caminho);
  }

  async apagarCadastro(input: { empresaId: string; usuarioId: string }) {
    const storageRoot = this.resolveStorageRoot();
    const funcionariosRoot = resolve(storageRoot, "funcionarios");
    const caminho = resolve(funcionariosRoot, input.empresaId, input.usuarioId);
    if (!caminho.startsWith(`${funcionariosRoot}${sep}`)) {
      throw new BadRequestException("Caminho de funcionario invalido.");
    }
    await rm(caminho, { recursive: true, force: true });
  }

  private validarFoto(arquivo?: CadastroFuncionarioArquivo) {
    if (!arquivo) throw new BadRequestException("Foto do tecnico e obrigatoria.");
    const extensoes: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    const extensao = extensoes[arquivo.mimetype];
    if (!extensao) throw new BadRequestException("Formato da foto invalido.");
    return { arquivo, extensao };
  }

  private validarAssinatura(arquivo?: CadastroFuncionarioArquivo) {
    if (!arquivo) throw new BadRequestException("Assinatura do tecnico e obrigatoria.");
    if (arquivo.mimetype !== "image/png" || extname(arquivo.originalname).toLowerCase() !== ".png") {
      throw new BadRequestException("Formato da assinatura invalido.");
    }
    return arquivo;
  }

  private resolveStorageRoot() {
    const configurado = this.config.get<string>("STORAGE_DIR")?.trim();
    if (configurado) return resolve(configurado);
    const cwd = process.cwd();
    return basename(cwd) === "backend" ? resolve(cwd, "..", "..", "storage") : resolve(cwd, "storage");
  }

  private storageUrl(relativePath: string) {
    return `/storage/${relativePath.replace(/\\/g, "/")}`;
  }
}
