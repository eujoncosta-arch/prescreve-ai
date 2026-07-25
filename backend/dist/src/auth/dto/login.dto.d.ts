import { Perfil } from '@prisma/client';
export declare class LoginDto {
    email: string;
    senha: string;
    mfa_code?: string;
}
export declare class RefreshDto {
    refresh_token: string;
}
export declare class RegisterDto {
    email: string;
    senha: string;
    crm?: string;
    especialidade?: string;
    uf?: string;
}
export declare class CriarUsuarioPrivilegiadoDto {
    email: string;
    senha: string;
    perfil: Perfil;
    crm?: string;
    especialidade?: string;
    uf?: string;
}
