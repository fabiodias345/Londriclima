import { deflateSync, inflateSync } from "node:zlib";

export type ImagemPdfCompacta = {
  dados: Buffer;
  filtro: string;
  width: number;
  height: number;
  orientacao: number;
};

export class AdminRelatorioAvulsoCompactoImagensService {
  normalizar(buffer: Buffer): ImagemPdfCompacta {
    if (this.ehJpeg(buffer)) {
      return {
        dados: buffer,
        ...this.obterDimensoesJpeg(buffer),
        orientacao: this.obterOrientacaoExifJpeg(buffer),
        filtro: " /Filter /DCTDecode"
      };
    }

    if (this.ehPng(buffer)) {
      const png = this.converterPngParaRgb(buffer);
      if (png) {
        return {
          dados: deflateSync(png.rgb),
          width: png.width,
          height: png.height,
          orientacao: 1,
          filtro: " /Filter /FlateDecode"
        };
      }
    }

    return {
      dados: Buffer.from([255, 255, 255]),
      filtro: "",
      width: 1,
      height: 1,
      orientacao: 1
    };
  }

  criarObjeto(imagem: ImagemPdfCompacta) {
    return `<< /Type /XObject /Subtype /Image /Width ${imagem.width} /Height ${imagem.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${imagem.filtro} /Length ${imagem.dados.length} >>\nstream\n${imagem.dados.toString("latin1")}\nendstream`;
  }

  transformacao(x: number, y: number, width: number, height: number, orientacao: number) {
    if (orientacao === 3) return `${-width} 0 0 ${-height} ${x + width} ${y + height} cm`;
    if (orientacao === 6) return `0 ${-height} ${width} 0 ${x} ${y + height} cm`;
    if (orientacao === 8) return `0 ${height} ${-width} 0 ${x + width} ${y} cm`;
    return `${width} 0 0 ${height} ${x} ${y} cm`;
  }

  private ehJpeg(buffer: Buffer) {
    return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  private ehPng(buffer: Buffer) {
    return buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  private converterPngParaRgb(buffer: Buffer) {
    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idat: Buffer[] = [];

    while (offset < buffer.length - 8) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
      const data = buffer.subarray(offset + 8, offset + 8 + length);
      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
      }
      if (type === "IDAT") idat.push(data);
      if (type === "IEND") break;
      offset += length + 12;
    }

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!width || !height || bitDepth !== 8 || !channels || !idat.length) return null;

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const linhas: Buffer[] = [];
    let rawOffset = 0;
    let anterior = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filtro = raw[rawOffset++];
      const atual = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
      rawOffset += stride;
      this.aplicarFiltroPng(atual, anterior, filtro, channels);
      linhas.push(atual);
      anterior = atual;
    }

    const rgb = Buffer.alloc(width * height * 3);
    let destino = 0;
    for (const linha of linhas) {
      for (let index = 0; index < linha.length; index += channels) {
        rgb[destino++] = linha[index];
        rgb[destino++] = linha[index + 1];
        rgb[destino++] = linha[index + 2];
      }
    }
    return { width, height, rgb };
  }

  private aplicarFiltroPng(linha: Buffer, anterior: Buffer, filtro: number, bytesPorPixel: number) {
    for (let index = 0; index < linha.length; index += 1) {
      const esquerda = index >= bytesPorPixel ? linha[index - bytesPorPixel] : 0;
      const acima = anterior[index] ?? 0;
      const acimaEsquerda = index >= bytesPorPixel ? anterior[index - bytesPorPixel] : 0;
      let ajuste = 0;
      if (filtro === 1) ajuste = esquerda;
      if (filtro === 2) ajuste = acima;
      if (filtro === 3) ajuste = Math.floor((esquerda + acima) / 2);
      if (filtro === 4) ajuste = this.paeth(esquerda, acima, acimaEsquerda);
      linha[index] = (linha[index] + ajuste) & 0xff;
    }
  }

  private paeth(esquerda: number, acima: number, acimaEsquerda: number) {
    const estimativa = esquerda + acima - acimaEsquerda;
    const distanciaEsquerda = Math.abs(estimativa - esquerda);
    const distanciaAcima = Math.abs(estimativa - acima);
    const distanciaAcimaEsquerda = Math.abs(estimativa - acimaEsquerda);
    if (distanciaEsquerda <= distanciaAcima && distanciaEsquerda <= distanciaAcimaEsquerda) return esquerda;
    if (distanciaAcima <= distanciaAcimaEsquerda) return acima;
    return acimaEsquerda;
  }

  private obterDimensoesJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 9;) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    return { width: 1, height: 1 };
  }

  private obterOrientacaoExifJpeg(buffer: Buffer) {
    for (let offset = 2; offset < buffer.length - 12;) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      const start = offset + 4;
      const end = start + length - 2;
      if (marker === 0xe1 && end <= buffer.length && buffer.subarray(start, start + 6).toString("ascii") === "Exif\0\0") {
        return this.lerOrientacaoExif(buffer.subarray(start + 6, end));
      }
      offset += 2 + length;
    }
    return 1;
  }

  private lerOrientacaoExif(tiff: Buffer) {
    if (tiff.length < 14) return 1;
    const littleEndian = tiff.subarray(0, 2).toString("ascii") === "II";
    const bigEndian = tiff.subarray(0, 2).toString("ascii") === "MM";
    if (!littleEndian && !bigEndian) return 1;
    const readUInt16 = (offset: number) => littleEndian ? tiff.readUInt16LE(offset) : tiff.readUInt16BE(offset);
    const readUInt32 = (offset: number) => littleEndian ? tiff.readUInt32LE(offset) : tiff.readUInt32BE(offset);
    const ifdOffset = readUInt32(4);
    if (ifdOffset + 2 > tiff.length) return 1;
    const total = readUInt16(ifdOffset);
    for (let index = 0; index < total; index += 1) {
      const entryOffset = ifdOffset + 2 + index * 12;
      if (entryOffset + 12 > tiff.length) break;
      if (readUInt16(entryOffset) === 0x0112) {
        const valor = readUInt16(entryOffset + 8);
        return [1, 3, 6, 8].includes(valor) ? valor : 1;
      }
    }
    return 1;
  }
}
