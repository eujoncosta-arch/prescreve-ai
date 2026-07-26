import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MigrarHistoricoDto } from './dto/migration.dto';
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
    migrarHistorico(usuarioId: string, dados: MigrarHistoricoDto): Promise<MigracaoResult>;
    verificarStatusMigracao(usuarioId: string): Promise<{
        migrado: boolean;
        prescricoes: number;
        validacoes: number;
    }>;
}
