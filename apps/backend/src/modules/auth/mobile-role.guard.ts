import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import type { AuthenticatedRequest } from "./authenticated-request";

const mobileRoles = new Set<string>([UsuarioRole.admin, UsuarioRole.tecnico, UsuarioRole.auxiliar]);

@Injectable()
export class MobileRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user?.role || !mobileRoles.has(request.user.role)) {
      throw new ForbiddenException("Acesso restrito ao app tecnico.");
    }

    return true;
  }
}
