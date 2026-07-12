import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/login.dto';
import type { Request } from 'express';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    refresh(dto: RefreshDto): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    logout(user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
}
