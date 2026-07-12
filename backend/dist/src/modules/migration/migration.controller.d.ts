import { MigrationService } from './migration.service';
export declare class MigrationController {
    private svc;
    constructor(svc: MigrationService);
    migrar(dados: {
        prescricoes?: unknown[];
        validacoes?: unknown[];
        consultas?: unknown[];
    }, user: {
        id: string;
    }): Promise<import("./migration.service").MigracaoResult>;
    status(user: {
        id: string;
    }): Promise<{
        migrado: boolean;
        prescricoes: number;
        validacoes: number;
    }>;
}
