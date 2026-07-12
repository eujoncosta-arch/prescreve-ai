import { Perfil } from '@prisma/client';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: Perfil[]) => import("@nestjs/common").CustomDecorator<string>;
