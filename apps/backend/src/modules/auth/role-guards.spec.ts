import { ForbiddenException } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { AdminRoleGuard } from "./admin-role.guard";
import { MobileRoleGuard } from "./mobile-role.guard";

function criarContexto(role?: string) {
  const request = {
    user: role ? { role } : undefined
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  };
}

test("AdminRoleGuard permite somente usuario admin no painel", () => {
  const guard = new AdminRoleGuard();

  assert.equal(guard.canActivate(criarContexto(UsuarioRole.admin) as never), true);
  assert.throws(() => guard.canActivate(criarContexto(UsuarioRole.tecnico) as never), ForbiddenException);
  assert.throws(() => guard.canActivate(criarContexto(UsuarioRole.auxiliar) as never), ForbiddenException);
});

test("MobileRoleGuard permite admin tecnico e auxiliar no app", () => {
  const guard = new MobileRoleGuard();

  assert.equal(guard.canActivate(criarContexto(UsuarioRole.admin) as never), true);
  assert.equal(guard.canActivate(criarContexto(UsuarioRole.tecnico) as never), true);
  assert.equal(guard.canActivate(criarContexto(UsuarioRole.auxiliar) as never), true);
  assert.throws(() => guard.canActivate(criarContexto("supervisor") as never), ForbiddenException);
});
