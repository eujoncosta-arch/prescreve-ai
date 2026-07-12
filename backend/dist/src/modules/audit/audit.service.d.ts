import { PrismaService } from '../../prisma/prisma.service';
import { TipoAuditoria } from '@prisma/client';
export interface AuditoriaInput {
    usuario_id?: string;
    crm_hash?: string;
    tipo: TipoAuditoria;
    acao: string;
    recurso?: string;
    dados_entrada?: Record<string, unknown>;
    dados_saida?: Record<string, unknown>;
    ip?: string;
    guideline_ref?: string;
    evidencia_ref?: string;
}
export declare class AuditService {
    private prisma;
    constructor(prisma: PrismaService);
    registrarAuditoria(input: AuditoriaInput): Promise<{
        timestamp: Date;
        id: string;
        crm_hash: string | null;
        usuario_id: string | null;
        tipo: import("@prisma/client").$Enums.TipoAuditoria;
        acao: string;
        recurso: string | null;
        dados_entrada: import("@prisma/client/runtime/client").JsonValue | null;
        dados_saida: import("@prisma/client/runtime/client").JsonValue | null;
        ip_hash: string | null;
        user_agent_hash: string | null;
        guideline_ref: string | null;
        evidencia_ref: string | null;
        hash_integridade: string;
    }>;
    buscarAuditoria(filtros: {
        usuario_id?: string;
        tipo?: TipoAuditoria;
        de?: Date;
        ate?: Date;
        pagina?: number;
        limite?: number;
    }): Promise<{
        total: number;
        pagina: number;
        limite: number;
        registros: {
            timestamp: Date;
            id: string;
            crm_hash: string | null;
            tipo: import("@prisma/client").$Enums.TipoAuditoria;
            acao: string;
            recurso: string | null;
            ip_hash: string | null;
            guideline_ref: string | null;
            evidencia_ref: string | null;
            hash_integridade: string;
        }[];
    }>;
    exportarAuditoria(usuario_id: string, formato?: 'json' | 'csv'): Promise<string>;
}
