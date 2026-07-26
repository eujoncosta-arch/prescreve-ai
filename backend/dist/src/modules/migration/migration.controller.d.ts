import { MigrationService } from './migration.service';
import { MigrarHistoricoDto } from './dto/migration.dto';
export declare class MigrationController {
    private svc;
    constructor(svc: MigrationService);
    migrar(dados: MigrarHistoricoDto, user: {
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
