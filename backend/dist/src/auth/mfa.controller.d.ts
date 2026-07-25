import { MfaService } from './mfa.service';
import { AtivarMfaDto, DesativarMfaDto } from './dto/mfa.dto';
export declare class MfaController {
    private mfa;
    constructor(mfa: MfaService);
    iniciarAtivacao(user: {
        id: string;
    }): Promise<import("./mfa.service").IniciarAtivacaoResult>;
    confirmarAtivacao(dto: AtivarMfaDto, user: {
        id: string;
    }): Promise<import("./mfa.service").ConfirmarAtivacaoResult>;
    desativar(dto: DesativarMfaDto, user: {
        id: string;
    }): Promise<{
        message: string;
    }>;
}
