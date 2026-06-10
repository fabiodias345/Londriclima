import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const empresa = await prisma.empresa.upsert({
    where: {
      cnpj: "00000000000000"
    },
    update: {
      nome: "LondriClima",
      telefone: null,
      email: null,
      ativa: true
    },
    create: {
      nome: "LondriClima",
      cnpj: "00000000000000",
      ativa: true
    }
  });

  console.log(`Empresa piloto pronta: ${empresa.nome} (${empresa.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
