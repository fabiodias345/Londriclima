import { test } from "node:test";
import * as assert from "node:assert/strict";
import { PasswordHashService } from "./password-hash.service";

test("PasswordHashService gera hash scrypt verificavel sem armazenar senha em texto puro", async () => {
  const service = new PasswordHashService();

  const hash = await service.hash("senha-super-secreta");

  assert.match(hash, /^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  assert.equal(hash.includes("senha-super-secreta"), false);
  assert.equal(await service.verify("senha-super-secreta", hash), true);
});

test("PasswordHashService rejeita senha incorreta", async () => {
  const service = new PasswordHashService();
  const hash = await service.hash("senha-correta");

  assert.equal(await service.verify("senha-errada", hash), false);
});

test("PasswordHashService rejeita hash malformado", async () => {
  const service = new PasswordHashService();

  assert.equal(await service.verify("qualquer-senha", "plaintext"), false);
  assert.equal(await service.verify("qualquer-senha", "bcrypt:salt:hash"), false);
});
