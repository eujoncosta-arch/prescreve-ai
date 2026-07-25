import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import type { Usuario } from '@prisma/client';
export interface IniciarAtivacaoResult {
    otpauth_url: string;
    secret_base32: string;
}
export interface ConfirmarAtivacaoResult {
    recovery_codes: string[];
}
export declare class MfaService {
    private prisma;
    private config;
    private audit;
    constructor(prisma: PrismaService, config: ConfigService, audit: AuditService);
    iniciarAtivacao(usuarioId: string): Promise<IniciarAtivacaoResult>;
    confirmarAtivacao(usuarioId: string, code: string): Promise<ConfirmarAtivacaoResult>;
    verificarCodigoLogin(usuario: Usuario, code: string): Promise<void>;
    desativar(usuarioId: string, senhaAtual: string, code: string): Promise<void>;
    private gerarCodigosRecuperacaoTexto;
    private tentarConsumirCodigoRecuperacao;
    private resetarFalhas;
    private registrarFalha;
}
