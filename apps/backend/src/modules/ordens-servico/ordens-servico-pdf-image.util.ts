import { deflateSync, inflateSync } from "node:zlib";

export function normalizarImagemPdf(buffer: Buffer | null) {
  if (buffer && ehJpeg(buffer)) {
    return {
      dados: buffer,
      ...obterDimensoesJpeg(buffer),
      filtro: " /Filter /DCTDecode"
    };
  }

  if (buffer && ehPng(buffer)) {
    const png = converterPngParaRgb(buffer);
    if (png) {
      return {
        dados: deflateSync(png.rgb),
        width: png.width,
        height: png.height,
        filtro: " /Filter /FlateDecode"
      };
    }
  }

  return {
    dados: Buffer.from([255, 255, 255]),
    width: 1,
    height: 1,
    filtro: ""
  };
}

function ehJpeg(buffer: Buffer) {
  return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function ehPng(buffer: Buffer) {
  return buffer.length > 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

function converterPngParaRgb(buffer: Buffer) {
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

    if (type === "IDAT") {
      idat.push(data);
    }

    if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels || !idat.length) {
    return null;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const linhas: Buffer[] = [];
  let rawOffset = 0;
  let anterior = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filtro = raw[rawOffset];
    rawOffset += 1;
    const atual = Buffer.from(raw.subarray(rawOffset, rawOffset + stride));
    rawOffset += stride;
    aplicarFiltroPng(atual, anterior, filtro, channels);
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

function aplicarFiltroPng(linha: Buffer, anterior: Buffer, filtro: number, bytesPorPixel: number) {
  for (let index = 0; index < linha.length; index += 1) {
    const esquerda = index >= bytesPorPixel ? linha[index - bytesPorPixel] : 0;
    const acima = anterior[index] ?? 0;
    const acimaEsquerda = index >= bytesPorPixel ? anterior[index - bytesPorPixel] : 0;
    let ajuste = 0;

    if (filtro === 1) ajuste = esquerda;
    if (filtro === 2) ajuste = acima;
    if (filtro === 3) ajuste = Math.floor((esquerda + acima) / 2);
    if (filtro === 4) ajuste = paethPng(esquerda, acima, acimaEsquerda);

    linha[index] = (linha[index] + ajuste) & 0xff;
  }
}

function paethPng(esquerda: number, acima: number, acimaEsquerda: number) {
  const estimativa = esquerda + acima - acimaEsquerda;
  const distanciaEsquerda = Math.abs(estimativa - esquerda);
  const distanciaAcima = Math.abs(estimativa - acima);
  const distanciaAcimaEsquerda = Math.abs(estimativa - acimaEsquerda);

  if (distanciaEsquerda <= distanciaAcima && distanciaEsquerda <= distanciaAcimaEsquerda) return esquerda;
  if (distanciaAcima <= distanciaAcimaEsquerda) return acima;
  return acimaEsquerda;
}

function obterDimensoesJpeg(buffer: Buffer) {
  for (let offset = 2; offset < buffer.length - 9; ) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7)
      };
    }

    offset += 2 + length;
  }

  return { width: 1, height: 1 };
}
