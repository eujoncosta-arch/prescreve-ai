import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    login(dto: LoginDto, ip?: string): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    refresh(token: string): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    private gerarTokens;
    private registrarAuditoria;
}
