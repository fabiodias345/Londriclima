import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

@Injectable()
export class PasswordHashService {
  async hash(password: string) {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
  }

  async verify(password: string, storedHash: string) {
    const [algorithm, salt, hash] = storedHash.split(":");

    if (algorithm !== "scrypt" || !salt || !hash) {
      return false;
    }

    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedKey = Buffer.from(hash, "hex");

    return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
  }
}
