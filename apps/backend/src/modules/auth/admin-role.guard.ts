import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { UsuarioRole } from "@prisma/client";
import type { AuthenticatedRequest } from "./authenticated-request";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.user?.role !== UsuarioRole.admin) {
      throw new ForbiddenException("Acesso restrito ao painel administrativo.");
    }

    return true;
  }
}
