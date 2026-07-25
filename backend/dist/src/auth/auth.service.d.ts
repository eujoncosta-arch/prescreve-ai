import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, CriarUsuarioPrivilegiadoDto } from './dto/login.dto';
import { MfaService } from './mfa.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private mfa;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, mfa: MfaService);
    register(dto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    criarUsuarioPrivilegiado(dto: CriarUsuarioPrivilegiadoDto, criadorId: string): Promise<{
        id: string;
        email: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    login(dto: LoginDto, ip?: string): Promise<{
        access_token: string;
        refresh_token: string;
        perfil: import("@prisma/client").$Enums.Perfil;
    }>;
    refresh(token: string, ip?: string): Promise<{
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
