import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const prisma = new PrismaClient();

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12 || password === "123456") {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 12 caracteres e não pode ser a senha padrão.");
  }

  const admin = await prisma.usuario.findFirst({ where: { login: "admin", role: "admin" } });
  if (!admin) {
    throw new Error("Usuário admin não encontrado; nenhuma conta foi alterada.");
  }

  await prisma.usuario.update({
    where: { id: admin.id },
    data: { senhaHash: await hashPassword(password) }
  });

  console.log("Senha do usuário admin atualizada.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha ao atualizar senha admin.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
