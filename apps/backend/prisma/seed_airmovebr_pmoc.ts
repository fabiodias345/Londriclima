import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scryptAsync = promisify(scrypt);

type MachineInput = {
  tag: string;
  local: string;
  tipo: string;
  marca: string;
  modelo?: string | null;
  capacidadeBtu: number;
  areaClimatizadaM2: number;
  ocupantesFixo: number;
  ocupantesVariavel: number;
};

type ClientInput = {
  nome: string;
  documento: string;
  endereco: {
    logradouro: string;
    numero?: string | null;
    bairro?: string | null;
    cidade: string;
    uf: string;
    cep?: string | null;
  };
  machines: MachineInput[];
};

const clients: ClientInput[] = [
  {
    nome: "Black Workout Academia LTDA",
    documento: "37774269000135",
    endereco: {
      logradouro: "Rodovia Celso Garcia Cid",
      numero: "123",
      cidade: "Londrina",
      uf: "PR"
    },
    machines: [
      { tag: "AC1", local: "Cozinha", tipo: "Split", marca: "Agratto", capacidadeBtu: 12000, areaClimatizadaM2: 45, ocupantesFixo: 40, ocupantesVariavel: 50 },
      { tag: "AC2", local: "Mezanino", tipo: "Piso teto", marca: "Nao informado", capacidadeBtu: 60000, areaClimatizadaM2: 45, ocupantesFixo: 40, ocupantesVariavel: 50 },
      ...rangeMachines("AC", 3, 7, "Musculacao", "Piso teto", "Nao informado", 60000, 45, 20, 50),
      ...rangeMachines("AC", 8, 10, "Musculacao", "Piso teto", "Gree", 60000, 45, 20, 50),
      ...rangeMachines("AC", 11, 12, "Musculacao", "Split", "Gree", 24000, 45, 20, 50),
      { tag: "AC13", local: "Sala Nutricionista", tipo: "Split", marca: "Philco", capacidadeBtu: 9000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 }
    ]
  },
  {
    nome: "Black Workout Escola de Ginastica e Danca LTDA",
    documento: "50536236000115",
    endereco: {
      logradouro: "Rua Mituo Morita",
      numero: "290",
      bairro: "Conjunto Habitacional Alexandre Urbanas",
      cidade: "Londrina",
      uf: "PR",
      cep: "86037-570"
    },
    machines: [
      ...rangeMachines("AC", 1, 2, "Musculacao", "Cassete", "Nao informado", 60000, 45, 40, 50),
      ...rangeMachines("AC", 3, 12, "Musculacao", "Piso teto", "Nao informado", 60000, 45, 20, 50),
      { tag: "AC13", local: "Banheiro Feminino", tipo: "Split", marca: "Philco", capacidadeBtu: 18000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 },
      { tag: "AC14", local: "Banheiro Masculino", tipo: "Split", marca: "Philco", capacidadeBtu: 18000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 },
      { tag: "AC15", local: "Cozinha", tipo: "Split", marca: "Philco", capacidadeBtu: 9000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 },
      { tag: "AC16", local: "Administrativo", tipo: "Split", marca: "Philco", capacidadeBtu: 9000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 },
      { tag: "AC17", local: "Sala Nutricionista", tipo: "Split", marca: "Philco", capacidadeBtu: 9000, areaClimatizadaM2: 45, ocupantesFixo: 20, ocupantesVariavel: 50 }
    ]
  }
];

function rangeMachines(
  prefix: string,
  start: number,
  end: number,
  local: string,
  tipo: string,
  marca: string,
  capacidadeBtu: number,
  areaClimatizadaM2: number,
  ocupantesFixo: number,
  ocupantesVariavel: number
) {
  return Array.from({ length: end - start + 1 }, (_, index) => ({
    tag: `${prefix}${start + index}`,
    local,
    tipo,
    marca,
    capacidadeBtu,
    areaClimatizadaM2,
    ocupantesFixo,
    ocupantesVariavel
  }));
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function findOrCreateEmpresa() {
  const empresaExistente = await prisma.empresa.findFirst({
    where: {
      OR: [
        { cnpj: "04959153000111" },
        { cnpj: "00000000000000" },
        { nome: "AIRMOVEBR" },
        { nomeFantasia: "AIRMOVEBR" }
      ]
    },
    orderBy: {
      criadoEm: "asc"
    }
  });

  const data = {
    nome: "AIRMOVEBR",
    razaoSocial: "M. Lima Manutencoes Prediais e Industriais LTDA",
    nomeFantasia: "AIRMOVEBR",
    cnpj: "04959153000111",
    telefone: "(43) 99100-0035",
    email: "airmovebr@gmail.com",
    logradouro: "Avenida Paissandu",
    numero: "526",
    cidade: "Maringa",
    uf: "PR",
    cep: "87050-130",
    ativa: true
  };

  if (empresaExistente) {
    return prisma.empresa.update({
      where: { id: empresaExistente.id },
      data
    });
  }

  return prisma.empresa.create({ data });
}

async function upsertTecnicoLocal(empresaId: string) {
  const senhaHash = await hashPassword("123456");
  const existente = await prisma.usuario.findFirst({
    where: {
      empresaId,
      email: "tecnico@airmovebr.local"
    }
  });

  const data = {
    empresaId,
    nome: "Joao Tecnico",
    login: "tecnico",
    email: "tecnico@airmovebr.local",
    senhaHash,
    role: "tecnico" as const,
    ativo: true
  };

  if (existente) {
    return prisma.usuario.update({
      where: { id: existente.id },
      data
    });
  }

  return prisma.usuario.create({ data });
}

async function upsertEngenheiro(empresaId: string) {
  const existente = await prisma.engenheiroResponsavel.findFirst({
    where: {
      empresaId,
      crea: "PR-206737/D"
    }
  });

  const data = {
    empresaId,
    nome: "Andre Mendes dos Santos",
    cpf: "",
    crea: "PR-206737/D",
    email: "",
    telefone: "",
    ativo: true
  };

  if (existente) {
    return prisma.engenheiroResponsavel.update({
      where: { id: existente.id },
      data
    });
  }

  return prisma.engenheiroResponsavel.create({ data });
}

async function upsertCliente(empresaId: string, engenheiroId: string, input: ClientInput) {
  const existente = await prisma.cliente.findFirst({
    where: {
      empresaId,
      documento: input.documento
    }
  });

  const data = {
    empresaId,
    tipo: "pj" as const,
    nome: input.nome,
    documento: input.documento,
    email: null,
    telefone: null,
    pmocAtivo: true,
    pmocArtNumero: null,
    engenheiroResponsavelId: engenheiroId
  };

  const cliente = existente
    ? await prisma.cliente.update({ where: { id: existente.id }, data })
    : await prisma.cliente.create({ data });

  await upsertEndereco(empresaId, cliente.id, input);

  for (const machine of input.machines) {
    await upsertEquipamento(empresaId, cliente.id, input.documento, machine);
  }

  return cliente;
}

async function upsertEndereco(empresaId: string, clienteId: string, input: ClientInput) {
  const existente = await prisma.clienteEndereco.findFirst({
    where: {
      empresaId,
      clienteId,
      principal: true
    }
  });

  const data = {
    empresaId,
    clienteId,
    nome: "Unidade principal",
    logradouro: input.endereco.logradouro,
    numero: input.endereco.numero ?? null,
    bairro: input.endereco.bairro ?? null,
    cidade: input.endereco.cidade,
    uf: input.endereco.uf,
    cep: input.endereco.cep ?? null,
    principal: true
  };

  if (existente) {
    await prisma.clienteEndereco.update({
      where: { id: existente.id },
      data
    });
    return;
  }

  await prisma.clienteEndereco.create({ data });
}

async function upsertEquipamento(empresaId: string, clienteId: string, documento: string, machine: MachineInput) {
  const codigoBarras = `${documento}-${machine.tag}`;
  const existente = await prisma.equipamento.findFirst({
    where: {
      empresaId,
      codigoBarras
    }
  });

  const data = {
    empresaId,
    clienteId,
    tipo: machine.tipo,
    patrimonio: machine.tag,
    codigoBarras,
    marca: machine.marca,
    modelo: machine.modelo ?? "Nao informado",
    capacidadeBtu: machine.capacidadeBtu,
    gasRefrigerante: null,
    numeroSerie: null,
    localInstalacao: machine.local,
    areaClimatizadaM2: machine.areaClimatizadaM2,
    ocupantesFixo: machine.ocupantesFixo,
    ocupantesVariavel: machine.ocupantesVariavel
  };

  if (existente) {
    await prisma.equipamento.update({
      where: { id: existente.id },
      data
    });
    return;
  }

  await prisma.equipamento.create({ data });
}

async function main() {
  const empresa = await findOrCreateEmpresa();
  const tecnico = await upsertTecnicoLocal(empresa.id);
  const engenheiro = await upsertEngenheiro(empresa.id);

  for (const client of clients) {
    await upsertCliente(empresa.id, engenheiro.id, client);
  }

  const [totalClientes, totalEquipamentos] = await Promise.all([
    prisma.cliente.count({
      where: {
        empresaId: empresa.id,
        documento: { in: clients.map((client) => client.documento) }
      }
    }),
    prisma.equipamento.count({
      where: {
        empresaId: empresa.id,
        cliente: {
          documento: { in: clients.map((client) => client.documento) }
        }
      }
    })
  ]);

  console.log(`Empresa local: ${empresa.nome} (${empresa.cnpj})`);
  console.log(`Login local: ${tecnico.email} / 123456`);
  console.log(`Engenheiro: ${engenheiro.nome} (${engenheiro.crea})`);
  console.log(`Clientes PMOC: ${totalClientes}`);
  console.log(`Maquinas PMOC: ${totalEquipamentos}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
