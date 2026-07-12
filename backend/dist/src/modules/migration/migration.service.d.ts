import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
interface LocalPrescricao {
    id?: string;
    medicamentos?: unknown[];
    orientacoes?: string;
    diagnostico?: string;
    criado_em?: string;
}
interface LocalValidacao {
    id?: string;
    crm_hash?: string;
    especialidade?: string;
    veredicto?: string;
    justificativa?: string;
}
export interface MigracaoResult {
    prescricoes_migradas: number;
    validacoes_migradas: number;
    erros: string[];
    duracao_ms: number;
}
export declare class MigrationService {
    private prisma;
    private audit;
    private readonly logger;
    constructor(prisma: PrismaService, audit: AuditService);
    migrarHistorico(usuarioId: string, dados: {
        prescricoes?: LocalPrescricao[];
        validacoes?: LocalValidacao[];
        consultas?: unknown[];
    }): Promise<MigracaoResult>;
    verificarStatusMigracao(usuarioId: string): Promise<{
        migrado: boolean;
        prescricoes: number;
        validacoes: number;
    }>;
}
export {};
